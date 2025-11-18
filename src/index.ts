import express, { NextFunction, Request, Response } from "express";
// import { VercelRequest, VercelResponse } from "@vercel/node";
// import { SpeedInsights } from "@vercel/speed-insights/next";
import mysql, { Connection, RowDataPacket } from "mysql2/promise";
import axios from "axios";
import cors from "cors";
import path from "path";
import "dotenv/config";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import fs, { access } from "fs";
import multer from "multer";

//** Swagger definition for API Calls*/
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AIADMK Members Management System API",
      version: "1.0.0",
      description:
        "API for managing members, OTP verification, and reports for AIADMK.",
      contact: {
        name: "LKPR GLobal LLP",
        url: "https://lkprglobal.com",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
    servers: [
      {
        url: "https://aiadmk-app-be.vercel.app",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT", // or "Token"
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/**/*.ts"], // Path to files with JSDoc annotations
};

const jwt = require("jsonwebtoken");
const body_parser = require("body-parser");

const specs = swaggerJsdoc(options);
const app = express();
// const port = process.env.PORT || 5253; // Include the port variable in .env, if you need to run on the different port

app.use(
  cors({
    // origin: ["http://localhost:5253", "http://localhost:8080"],
    origin: [
      "https://aiadmk-app-be.vercel.app",
      "https://aiadmk-app-be.vercel.app/api-docs",
      "https://aiadmk.lkprglobal.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    // credentials: true,
    // exposedHeaders: ["Content-Disposition"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// app.use(express.json({ limit: "100mb" })); // Increase JSON payload limit
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// app.use(body_parser.json({ limit: "100mb" })); // Increase body-parser limit

//** OTP Store and Token generations */
// JWT secret (store in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Define types (add to types.ts or server.ts)
interface TeamRow extends RowDataPacket {
  tcode?: string | null;
  dcode?: string | null;
  jcode?: string | null; // Aliased jvalue
  tname?: string | null;
  dname?: string | null;
  jname?: string | null; // Aliased jname
}

// Interface for JWT payload
interface JwtPayload {
  id: number;
  role: string;
}

// Extend Request to include user property
interface AuthRequest extends Request {
  user?: JwtPayload;
}

// Middleware to verify JWT token
const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: () => void
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach decoded user (id, role)
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

//** Debug dotenv loading*/
console.log("Dotenv path:", path.resolve(__dirname, "../.env"));
console.log("Environment variables:", {
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN ? "****" : "undefined",
});

/* The above code is a commented-out configuration object for a database connection in a TypeScript
file. It contains properties such as host, user, password, database, waitForConnections,
connectionLimit, and queueLimit. These properties define the settings for connecting to a database,
including the host address, user credentials, database name, connection limits, and queue limits.
The code is currently commented out, so it is not actively used in the program. */

// const dbConfig = {
//   host: "localhost",
//   user: "lkprglobal_localdev",
//   password: "PdK1!gc8Ep%n",
//   database: "aiadmk_db",
//   waitForConnections: true,
//   connectionLimit: 10, // adjust as needed
//   queueLimit: 0,
// };

/* The above code is creating a connection pool using the `mysql` module in TypeScript. It specifies
the host, user, password, and database details for connecting to a MySQL database. It also sets some
configuration options for the connection pool such as `waitForConnections`, `connectionLimit`,
`enableKeepAlive`, `queueLimit`, and `keepAliveInitialDelay`. This connection pool can be used to
efficiently manage multiple database connections and handle database operations in a scalable
manner. */
const pool = mysql.createPool({
  host: "srv1876.hstgr.io",
  user: "u238482420_lkpr_aiadmk",
  password: "CO^RAVc2dU@",
  database: "u238482420_aiadmk",
  waitForConnections: true,
  connectionLimit: 10,
  enableKeepAlive: true, // helps avoid idle timeout
  queueLimit: 0,
  keepAliveInitialDelay: 0,
});

// Initialized database connection

async function query<T = RowDataPacket[]>(
  sql: string,
  params?: any[]
): Promise<T> {
  try {
    const [rows] = await pool.query<T & RowDataPacket[]>(sql, params); // returns rows only
    return rows;
  } catch (err) {
    console.error("DB query error:", err);
    throw err;
  }
}
//** WhatsApp API configuration*/
const whatsappToken = process.env.WHATSAPP_TOKEN;
let whatsappUrl = `https://api.lkprglobal.com/v1/message/send-message?token=${whatsappToken}`;

//** Generate 6-digit OTP*/
const generateOTP: () => string = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/* The `sanitizePhoneNumber` function is a utility function that takes a phone number as input, removes
any non-numeric characters, adds the country code '+91' if missing, and returns the sanitized phone
number in the format '+91XXXXXXXXXX'. */
const sanitizePhoneNumber = (number: string): string => {
  if (!number) return "";
  const numberWithPlus = number.replace(/^\+/, "");
  const cleanNumber = numberWithPlus.replace(/[^0-9]/g, "");
  return `+91${cleanNumber}`;
};

/* The `formatWhatsAppNumber` function is a utility function that takes a phone number as input,
removes any non-numeric characters, and ensures that the number is formatted correctly for WhatsApp API. */
const formatWhatsAppNumber = (number: string): string => {
  const cleanNumber = number.replace(/[^0-9]/g, "");
  return cleanNumber.startsWith("+91") ? cleanNumber : `91${cleanNumber}`;
};

//**Mobile validation */
const mobile_validate = (mobile: string): boolean => {
  const mobileRegex = /^\+91[0-9]{10}$/;
  return mobileRegex.test(mobile);
};

// // upload configuration
// // Create uploads folder if not exists
// const uploadDir = path.join(__dirname, "uploads/members");
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// // Configure multer storage for members picture uploads
// const member_storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadDir),
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
//   },
// });

// const memberUpload = multer({ storage: member_storage });

// //configure multer storage for events image uploads
// // Multer setup

// const eventUploadDir = path.join(__dirname, "uploads/events");
// if (!fs.existsSync(eventUploadDir)) {
//   fs.mkdirSync(eventUploadDir, { recursive: true });
// }
// const event_storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, eventUploadDir); // save in uploads/events
//   },
//   filename: (req, file, cb) => {
//     const uniquename = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, `${uniquename}${path.extname(file.originalname)}`);
//   },
// });

// const eventUpload = multer({ storage: event_storage });
// Multer setup - store in memory instead of file system
const memberUpload = multer({ storage: multer.memoryStorage() });
const eventUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/* The `// Retry logic for API requests` section in the code is implementing a retry mechanism for
making API requests. This mechanism allows the code to retry sending an API request a specified
number of times if the initial request fails. */
// const sendWithRetry = async (
//   url: string,
//   payload: any,
//   headers: any,
//   retries: number = 3,
//   delay: number = 1000
// ): Promise<{ success: boolean; data?: any; status?: number; error?: any }> => {
//   let lastError: any = null;
//   for (let i = 0; i < retries; i++) {
//     try {
//       const response = await axios.post(url, payload, { headers });
//       return { success: true, data: response.data, status: response.status };
//     } catch (err) {
//       lastError = err;
//       console.error(`Attempt ${i + 1} failed:`, {
//         message: (err as Error).message,
//         code: (err as any).code,
//         response: (err as any).response?.data,
//         status: (err as any).response?.status,
//         headers: (err as any).response?.headers,
//       });
//       if (i < retries - 1) await new Promise((resolve) => setTimeout(resolve, delay));
//     }
//   }
//   return { success: false, error: lastError };
// };

/* The code snippet you provided is defining a POST endpoint `/api/register` in the Express
application. When a POST request is made to this endpoint, the server executes the callback function
specified, which handles the registration process for a new user / admin. */

app.get("/", (req, res) => {
  res.send("Server is up 🚀. Check /api-docs for docs.");
});

/**
 * @swagger
 * /api/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user / admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               mobile:
 *                 type: string
 *               role:
 *                 type: string
 *             required:
 *               - mobile
 *               - role
 *     responses:
 *       200:
 *         description: Admin registered successfully
 *       400:
 *         description: Invalid input or duplicate mobile
 *       500:
 *         description: Server error
 */

app.post(
  "/api/register",
  express.json({ limit: "100mb" }),
  body_parser.json({ limit: "100mb" }),
  async (req, res) => {
    const { username, mobile, role } = req.body;
    const sanitizedMobile = sanitizePhoneNumber(mobile);
    // Validate input
    if (!mobile) {
      return res.status(400).json({ error: "Mobile number is required" });
    }
    if (!mobile_validate(sanitizedMobile)) {
      return res.status(400).json({ error: "Invalid mobile number format" });
    }
    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }

    // Check for duplicate mobile
    try {
      const existingUser = await query(
        "SELECT * FROM admins WHERE mobile = ?",
        [sanitizedMobile]
      );
      if (!existingUser) {
        return res.status(400).json({ error: "Mobile number already exists" });
      }

      const result: any = await query(
        "INSERT INTO admins (username, mobile, role) VALUES (?, ?, ?)",
        [username, sanitizedMobile, role]
      );
      const insertId = (result as any).insertId;
      return res.status(201).json({
        message: "Admin registered successfully",
        id: insertId,
        user: {
          id: insertId,
          username,
          mobile: sanitizedMobile,
          role,
        },
      });
    } catch (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * @swagger
 * /api/Login:
 *   post:
 *     tags: [Auth]
 *     summary: Login for user / admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mobile:
 *                 type: string
 *             required:
 *               - mobile
 *     responses:
 *       200:
 *         description: Admin logged in successfully
 *       400:
 *         description: Invalid input or duplicate mobile
 *       500:
 *         description: Server error
 */
/**
 * The function handles user login by generating an OTP, validating the mobile number, and sending the
 * OTP via WhatsApp.
 */
app.post(
  "/api/Login",
  express.json({ limit: "100mb" }),
  body_parser.json({ limit: "100mb" }),
  async (req, res) => {
    const { mobile } = req.body;
    const sanitizedMobile = sanitizePhoneNumber(mobile);
    // Validate input
    if (!mobile) {
      return res.status(400).json({ error: "Mobile number is required" });
    }
    if (!mobile_validate(sanitizedMobile)) {
      return res.status(400).json({ error: "Invalid mobile number format" });
    }

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes
    const whatsappNumber = formatWhatsAppNumber(mobile);

    try {
      const isLogin: any = await query(
        "SELECT * FROM admins WHERE mobile = ?",
        [sanitizedMobile]
      );
      if (isLogin.length === 0) {
        return res.status(404).json({ error: "Mobile number not found" });
      }
    } catch {
      return res.status(500).json({ error: "Server error" });
    }

    // Function to send OTP via WhatsApp
    async function sendWhatsAppOTP() {
      try {
        const response = await axios.post(whatsappUrl, {
          to: whatsappNumber,
          type: "template",
          template: {
            language: { policy: "deterministic", code: "en" },
            name: "otp_copy",
            components: [
              { type: "body", parameters: [{ type: "text", text: otp }] },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [{ type: "text", text: otp }],
              },
            ],
          },
        });

        console.log("WhatsApp API response:", response.data);
      } catch (error) {
        console.error("WhatsApp API error:", error);
      }
    }

    query("UPDATE admins SET otp = ?, otp_expiry = ? WHERE mobile = ?", [
      otp,
      expiry,
      sanitizedMobile,
    ]).then((result: any) => {
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Mobile number not found" });
      }
      // Send OTP via WhatsApp
      sendWhatsAppOTP();
      return res.status(200).json({ message: "OTP sent successfully" });
    });
  }
);

/**
 * @swagger
 * /api/validate-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify user/admin OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mobile:
 *                 type: string
 *               otp:
 *                 type: string
 *             required:
 *               - mobile
 *               - otp
 *     responses:
 *       200:
 *         description: User / Admin  logged in successfully
 *       400:
 *         description: Invalid input or duplicate mobile
 *       500:
 *         description: Server error
 */

app.post(
  "/api/validate-otp",
  express.json({ limit: "100mb" }),
  body_parser.json({ limit: "100mb" }),
  async (req: Request, res: Response): Promise<void> => {
    if (res.headersSent) {
      console.log("Headers already sent in /api/validate-otp");
      return;
    }
    const { mobile, otp } = req.body;
    const sanitizedMobile = sanitizePhoneNumber(mobile);

    // Validate input
    if (!mobile) {
      res
        .status(400)
        .json({ success: false, error: "Mobile number is required" });
      return;
    }
    if (!otp) {
      res.status(400).json({ success: false, error: "OTP is required" });
      return;
    }

    try {
      // Query user with mobile and OTP, including otp_expiry
      const [results] = await query<RowDataPacket[]>(
        "SELECT id, username, created_at, is_verified, role, otp_expiry FROM admins WHERE mobile = ? AND otp = ?",
        [sanitizedMobile, otp]
      );

      if (results.length === 0) {
        res
          .status(400)
          .json({ success: false, error: "Invalid mobile number or OTP" });
        return;
      }

      const user = results;

      // Check OTP expiry
      if (user.otp_expiry && new Date(user.otp_expiry) < new Date()) {
        res.status(400).json({ success: false, error: "OTP has expired" });
        return;
      }

      // Generate JWT token
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: "1h",
      });

      // Clear OTP and update is_verified
      await query(
        "UPDATE admins SET otp = NULL, otp_expiry = NULL, is_verified = 1 WHERE mobile = ?",
        [sanitizedMobile]
      );

      // Send response
      res.status(200).json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          created_at: user.created_at,
          is_verified: 1,
          role: user.role,
        },
        message: "Login successful",
      });
    } catch (error) {
      console.error("Admin check error:", error);
      if (res.headersSent) {
        console.log("Headers already sent in /api/validate-otp catch");
        return;
      }
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Validate Token endpoint
app.get(
  "/api/validate-token",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await query(
        "SELECT id, username, mobile, role FROM admins WHERE role = ?",
        [req.user?.role]
      );

      if (rows.length === 0) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      const user = rows.map((row) => ({
        id: row.id,
        username: row.username,
        mobile: row.mobile,
        role: row.role,
      }));

      const firstUser = user[0];

      res.json({
        success: true,
        user: {
          id: firstUser.id,
          username: firstUser.username,
          mobile: firstUser.mobile,
          role: firstUser.role,
        },
        message: "Token valid",
      });
    } catch (error) {
      console.error("Validate token error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/**
 * @swagger
 * /api/view-members:
 *   get:
 *     summary: Get all members
 *     tags: [Members]
 *     responses:
 *       200:
 *         description: List of all members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 */
app.get(
  "/api/view-members",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (res.headersSent) return;
    try {
      const rows = await query<RowDataPacket[]>(
        "SELECT id, mobile, name, imageData, imageType, date_of_birth, parents_name, address, education_qualification, caste, DATE_FORMAT(joining_date, '%Y-%m-%d') as joining_date, joining_details, party_member_number, voter_id, aadhar_number, created_at, tname, dname, jname FROM users"
      );
      const members = rows.map((row) => ({
        id: row.id,
        name: row.name,
        imageData: row.imageData,
        imageType: row.imageType,
        date_of_birth: row.date_of_birth,
        mobile: row.mobile,
        parents_name: row.parents_name,
        address: row.address,
        education_qualification: row.education_qualification,
        caste: row.caste,
        party_member_number: row.party_member_number,
        joining_date: row.joining_date,
        joining_details: row.joining_details,
        voter_id: row.voter_id,
        aadhar_number: row.aadhar_number,
        created_at: row.created_at,
        updated_at: row.updated_at,
        jname: row.jname,
        tname: row.tname,
        dname: row.dname,
      }));
      res.json({ success: true, members, count: members.length });
    } catch (error) {
      console.error("Get members error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);
/**
 * @swagger
 * /api/Register-Member:
 *   post:
 *     tags: [Members]
 *     summary: Register a new member
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               mobile:
 *                 type: string
 *               name:
 *                 type: string
 *               parents_name:
 *                 type: string
 *               address:
 *                 type: string
 *               education_qualification:
 *                 type: string
 *               caste:
 *                 type: string
 *               joining_details:
 *                 type: string
 *               party_member_number:
 *                 type: string
 *               voter_id:
 *                 type: string
 *               aadhar_number:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *               dname:
 *                 type: string
 *               tname:
 *                 type: string
 *               jname:
 *                 type: string
 *             required:
 *               - mobile
 *               - name
 *               - parents_name
 *               - address
 *               - education_qualification
 *               - caste
 *               - joining_details
 *               - party_member_number
 *               - voter_id
 *               - aadhar_number
 *               - dname
 *               - tname
 *               - jname
 *     responses:
 *       200:
 *         description: Members registered successfully
 *       400:
 *         description: Invalid input or duplicate Member
 *       500:
 *         description: Server error
 */

app.post(
  "/api/Register-Member/",
  memberUpload.single("image"),
  express.json({ limit: "100mb" }),
  body_parser.json({ limit: "100mb" }),
  async (req: Request, res: Response) => {
    const {
      mobile,
      name,
      date_of_birth,
      parents_name,
      address,
      education_qualification,
      caste,
      joining_date,
      joining_details,
      party_member_number,
      voter_id,
      aadhar_number,
      dname,
      tname,
      jname,
    } = req.body;

    const id = crypto.randomUUID();

    // Use req.file for single image upload
    const imageBuffer = req.file ? req.file.buffer : null;
    const imageType = req.file ? req.file.mimetype : null;
    // Validate required fields

    try {
      // 1. Get current member
      const rows: any = await query("SELECT * FROM users WHERE mobile = ?", [
        mobile,
      ]);

      if (rows.length != 0) {
        return res
          .status(404)
          .json({ success: false, message: "Member Already Registered" });
      }

      // Insert member
      const result: any = await query(
        `INSERT INTO users (id, mobile, name, imageData, imageType, date_of_birth, parents_name, address, education_qualification, caste, joining_date, joining_details, party_member_number, voter_id, aadhar_number, tname, dname, jname) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          mobile || null,
          name || null,
          imageBuffer || null,
          imageType || null,
          date_of_birth || null,
          parents_name || null,
          address || null,
          education_qualification || null,
          caste || null,
          joining_date || null,
          joining_details || null,
          party_member_number || null,
          voter_id || null,
          aadhar_number || null,
          tname || null,
          dname || null,
          jname || null,
        ]
      );

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Member not found" });
      }

      // 5. Return updated member
      return res.json({
        success: true,
        member: {
          id,
          name,
          mobile,
          joining_date,
          party_member_number,
          dname,
          tname,
          jname,
          parents_name,
        },
        message: "Member Added successfully",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /api/Update-Member/{id}:
 *   post:
 *     tags: [Members]
 *     summary: Update an existing member
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           properties:
 *             id:
 *               type: Integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mobile:
 *                 type: string
 *               name:
 *                 type: string
 *               parents_name:
 *                 type: string
 *               address:
 *                 type: string
 *               education_qualification:
 *                 type: string
 *               caste:
 *                 type: string
 *               joining_details:
 *                 type: string
 *               party_member_number:
 *                 type: string
 *               voter_id:
 *                 type: string
 *               aadhar_number:
 *                 type: string
 *               image:
 *                 type: string
 *               dname:
 *                 type: string
 *               tname:
 *                 type: string
 *               jname:
 *                 type: string
 *             required:
 *               - mobile
 *               - name
 *               - parents_name
 *               - address
 *               - education_qualification
 *               - caste
 *               - joining_details
 *               - party_member_number
 *               - voter_id
 *               - aadhar_number
 *               - image
 *               - dname
 *               - tname
 *               - jname
 *     responses:
 *       200:
 *         description: Members registered successfully
 *       400:
 *         description: Invalid input or duplicate Member
 *       500:
 *         description: Server error
 */
app.put(
  "/api/update-member/:id",
  memberUpload.single("image"),
  async (req: Request, res: Response) => {
    const {
      mobile,
      name,
      date_of_birth,
      parents_name,
      address,
      education_qualification,
      caste,
      joining_date,
      joining_details,
      party_member_number,
      voter_id,
      aadhar_number,
      dname,
      tname,
      jname,
    } = req.body;

    const id = req.params.id;
    const file = req.file;
    if (!id) return res.status(400).json({ error: "ID is required" });

    try {
      // Get current member
      const rows: any = await query("SELECT * FROM users WHERE id = ?", [id]);
      if (!rows || rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Member not found" });
      }

      // Handle image
      let finalImage = file ? file.buffer : rows[0].imageData;
      let finalImageType = file ? file.mimetype : rows[0].imageType;

      // ⚠️ Remove uniqueness check (no need during update)
      // You only need uniqueness during CREATE

      // Update member
      const result: any = await query(
        `UPDATE users 
         SET mobile = ?, name = ?, imageData = ?, imageType = ?, date_of_birth = ?, parents_name = ?, address = ?, 
             education_qualification = ?, caste = ?, joining_date = ?, 
             joining_details = ?, party_member_number = ?, voter_id = ?, 
             aadhar_number = ?, tname = ?, dname = ?, jname = ? 
         WHERE id = ?`,
        [
          mobile || null,
          name || null,
          finalImage || null,
          finalImageType || null,
          date_of_birth || null,
          parents_name || null,
          address || null,
          education_qualification || null,
          caste || null,
          joining_date || null,
          joining_details || null,
          party_member_number || null,
          voter_id || null,
          aadhar_number || null,
          tname || null,
          dname || null,
          jname || null,
          id,
        ]
      );

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Update failed" });
      }

      return res.json({
        success: true,
        message: "Member updated successfully",
        member: {
          id: parseInt(id),
          name,
          mobile,
          date_of_birth,
          parents_name,
          address,
          education_qualification,
          caste,
          joining_date,
          joining_details,
          party_member_number,
          voter_id,
          aadhar_number,
          dname,
          tname,
          jname,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /api/delete-member/{id}:
 *   post:
 *     tags: [Members]
 *     summary: Delete an existing member
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           properties:
 *             id:
 *               type: Integer
 *     responses:
 *       200:
 *         description: Members registered successfully
 *       400:
 *         description: Invalid input or duplicate Member
 *       500:
 *         description: Server error
 */

app.delete("/api/delete-member/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const memberId = parseInt(id);

  if (isNaN(memberId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid member id" });
  }

  try {
    // Fetch existing member first to delete the image file
    const rows: any = await query("SELECT * FROM users WHERE id = ?", [
      memberId,
    ]);
    const member = rows[0];
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    // // Delete image file from disk
    // if (member.image) {
    //   const imagePath = path.join(__dirname, "../src/", member.image); // adjust path
    //   fs.unlink(imagePath, (err) => {
    //     if (err) console.warn("Failed to delete image file:", err);
    //   });
    // }
    // Delete from DB
    const result = await query("DELETE FROM users WHERE id = ?", [memberId]);

    if ((result as any).affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    res.json({ success: true, message: "Member deleted successfully" });
  } catch (error) {
    console.error("Delete member error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @swagger
 * /api/view-positions:
 *   get:
 *     summary: Get all positions
 *     tags: [Positions]
 *     responses:
 *       200:
 *         description: List of all positions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 */
app.get(
  "/api/view-positions",
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (res.headersSent) {
      console.log("Headers already sent in /api/view-positions");
      return;
    }
    try {
      const results = await query(
        "SELECT DISTINCT tcode, dcode, jcode, tname, dname, jname FROM teams"
      );
      const positions = results as TeamRow[];
      res.json({ success: true, positions });
      return;
    } catch (error) {
      console.error("Fetch positions error:", error);
      if (res.headersSent) {
        console.log("Headers already sent in /api/positions catch");
        return;
      }
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/**
 * @swagger
 * /api/export-members:
 *   get:
 *     summary: export all members
 *     tags: [Members]
 *     responses:
 *       200:
 *         description: export members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 */
// ✅ Export all members
app.get(
  "/api/export/members",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const rows: any = await query("SELECT * FROM users");

      if (!rows.length) {
        return res
          .status(404)
          .json({ success: false, message: "No members found" });
      }
      const fields = Object.keys(rows[0]);
      const csv = [
        fields.join(","), // header row
        ...rows.map((row: any) =>
          fields.map((f) => `"${row[f] ?? ""}"`).join(",")
        ),
      ].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=all_members.csv"
      );
      await res.send(csv);
      res.end();
    } catch (error) {
      console.error("Export all members error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/**
 * @swagger
 * /api/export-member:
 *   get:
 *     summary: export particular member
 *     tags: [Members]
 *     responses:
 *       200:
 *         description: export member
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 */
// ✅ Export single member by ID
app.get(
  "/api/export/member/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const rows: any = await query("SELECT * FROM users WHERE id = ?", [id]);

      if (!rows.length) {
        return res
          .status(404)
          .json({ success: false, message: "Member not found" });
      }

      const member = rows[0];
      const fields = Object.keys(member);
      const csv = [
        fields.join(","), // header row
        ...rows.map((row: any) =>
          fields.map((f) => `"${row[f] ?? ""}"`).join(",")
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      // res.setHeader(
      //   "Content-Disposition",
      //   `attachment; filename=member_${member?.party_member_number}.csv`
      // );
      await res.send(csv);
      res.end();
    } catch (error) {
      console.error("Export single member error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/**
 * @swagger
 * paths:
 *   /view-events:
 *     get:
 *       summary: Get all events
 *       tags: [Events]
 *       responses:
 *         "200":
 *           description: List of events
 *           content:
 *             application/json:
 *               schema:
 *                 type: array
 */
app.get(
  "/api/view-events",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const rows = await query(`SELECT * FROM events`);

      res.json({ success: true, events: rows });
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch events" });
    }
  }
);

/**
 * @swagger
 * /add-event:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Independence Day Celebration
 *               type:
 *                 type: string
 *                 enum: [party, government]
 *                 example: party
 *               date:
 *                 type: string
 *                 format: date
 *                 example: 2025-09-10
 *               time:
 *                 type: string
 *                 format: time
 *                 example: 10:30
 *               location:
 *                 type: string
 *                 example: Chennai, Tamil Nadu
 *               description:
 *                 type: string
 *                 example: A large gathering to celebrate...
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       "201":
 *         description: Event created successfully
 */

app.post("/api/add-event", eventUpload.array("images", 3), async (req, res) => {
  try {
    const { title, type, date, time, location, description } = req.body || {};

    // Validate file uploads
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No images uploaded" });
    }
    // Convert each file to buffer + type
    const files = req.files || [];
    const imageBuffers = files.map((f) => f.buffer);
    const imageTypes = files.map((f) => f.mimetype);
    // Validate required fields
    if (!title || !date) {
      return res
        .status(400)
        .json({ success: false, message: "Title and date are required" });
    }

    // Format date and time
    const formattedDate = new Date(date).toISOString().split("T")[0]; // YYYY-MM-DD
    const formattedTime = time && time.length <= 5 ? `${time}:00` : time; // HH:mm:ss

    // Save to DB (example)
    const result: any = await query(
      `INSERT INTO events (title, type, date, time, location, description, imageData, imageType)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        type,
        formattedDate,
        formattedTime,
        location,
        description,
        imageBuffers[0] || null,
        imageTypes[0] || null,
      ]
    );

    return res.json({
      success: true,
      result: {
        title,
        type,
        date: formattedDate,
        time: formattedTime,
        location,
        description,
      },
      message: "Event added successfully",
    });
  } catch (err) {
    console.error("Event add error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @swagger
 * /events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       "200":
 *         description: Event details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Event"
 *       "404":
 *         description: Event not found
 */
app.get(
  "/api/event/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const rows: any = await query("SELECT * FROM events WHERE id = ?", [id]);
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }
      res.json({ success: true, event: rows[0] });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch event" });
    }
  }
);

/**
 * @swagger
 * /api/update-event/{id}:
 *   post:
 *     tags: [Events]
 *     summary: Update an existing event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           properties:
 *             id:
 *               type: Integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mobile:
 *                 type: string
 *               name:
 *                 type: string
 *               parents_name:
 *                 type: string
 *               address:
 *                 type: string
 *               education_qualification:
 *                 type: string
 *               caste:
 *                 type: string
 *               joining_details:
 *                 type: string
 *               party_member_number:
 *                 type: string
 *               voter_id:
 *                 type: string
 *               aadhar_number:
 *                 type: string
 *               image:
 *                 type: string
 *               dname:
 *                 type: string
 *               tname:
 *                 type: string
 *               jname:
 *                 type: string
 *             required:
 *               - mobile
 *               - name
 *               - parents_name
 *               - address
 *               - education_qualification
 *               - caste
 *               - joining_details
 *               - party_member_number
 *               - voter_id
 *               - aadhar_number
 *               - image
 *               - dname
 *               - tname
 *               - jname
 *     responses:
 *       200:
 *         description: Members registered successfully
 *       400:
 *         description: Invalid input or duplicate Member
 *       500:
 *         description: Server error
 */
app.put(
  "/api/update-event/:id",
  authenticateToken,
  eventUpload.array("images", 3),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, type, date, time, location, description } = req.body;

    try {
      const rows: any = await query("SELECT * FROM events WHERE id = ?", [id]);
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }

      const oldImage = rows[0].image;
      const newImage = req.file
        ? `uploads/events/${req.file.filename}`
        : oldImage;

      // Fix: Declare imagePaths for update
      const imagePaths = req.files
        ? (req.files as Express.Multer.File[]).map((file) => file.path)
        : oldImage
        ? [oldImage]
        : [];

      await query(
        `UPDATE events SET title=?, type=?, date=?, time=?, location=?, description=?, images=? WHERE id=?`,
        [
          title,
          type,
          date,
          time,
          location,
          description,
          JSON.stringify(imagePaths),
          id,
        ]
      );

      res.json({ success: true, message: "Event updated successfully" });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ success: false, message: "Failed to update event" });
    }
  }
);

/**
 * @swagger
 * /delete-event/{id}:
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 */
app.delete(
  "/api/delete-event/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const rows: any = await query("SELECT * FROM events WHERE id = ?", [id]);
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Event not found" });
      }

      const event = rows[0];
      if (event.image) {
        const fs = require("fs");
        const imgPath = path.join(__dirname, "..", event.image);
        fs.unlink(imgPath, (err: any) => {
          if (err) console.warn("Failed to delete event image:", err);
        });
      }

      await query("DELETE FROM events WHERE id = ?", [id]);

      res.json({ success: true, message: "Event deleted successfully" });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ success: false, message: "Failed to delete event" });
    }
  }
);

/**
 * @swagger
 * /api/view-funds:
 *   get:
 *     summary: Get all funds
 *     tags: [Funds]
 *     responses:
 *       200:
 *         description: List of all funds
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 */
app.get(
  "/api/view-funds",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const rows = await query(
        "SELECT id, taskname, tunion, tparvunion, tpanchayat, tvillage, year, fundname, boothno, status, created_at, updated_at FROM funds"
      );
      res.json({ success: true, funds: rows, count: rows.length });
    } catch (error) {
      console.error("Get funds error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/**
 * @swagger
 * /api/funds/{id}:
 *   get:
 *     summary: Get fund by ID
 *     tags: [Funds]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fund details
 *       404:
 *         description: Fund not found
 */
app.get(
  "/api/funds/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const rows: any = await query("SELECT * FROM funds WHERE id = ?", [id]);
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Fund not found" });
      }
      res.json({ success: true, fund: rows[0] });
    } catch (error) {
      console.error("Get fund error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/**
 * @swagger
 * /api/add-fund:
 *   post:
 *     tags: [Funds]
 *     summary: Create a new fund
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskname:
 *                 type: string
 *               tunion:
 *                 type: string
 *               tparvunion:
 *                 type: string
 *               tpanchayat:
 *                 type: string
 *               tvillage:
 *                 type: string
 *               year:
 *                 type: string
 *               fundname:
 *                 type: string
 *               boothno:
 *                 type: integer
 *               status:
 *                 type: string
 *             required:
 *               - taskname
 *               - tunion
 *               - fundname
 *               - boothno
 *     responses:
 *       201:
 *         description: Fund created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
app.post(
  "/api/add-fund",
  authenticateToken,
  express.json({ limit: "100mb" }),
  body_parser.json({ limit: "100mb" }),
  async (req: Request, res: Response) => {
    const {
      taskname,
      tunion,
      tparvunion,
      tpanchayat,
      tvillage,
      year,
      fundname,
      boothno,
      status,
    } = req.body;

    // Validate required fields
    if (!taskname || !tunion || !fundname || boothno === undefined) {
      return res.status(400).json({
        success: false,
        message: "taskname, tunion, fundname, and boothno are required",
      });
    }

    try {
      const result: any = await query(
        `INSERT INTO funds (taskname, tunion, tparvunion, tpanchayat, tvillage, year, fundname, boothno, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskname,
          tunion,
          tparvunion || null,
          tpanchayat || null,
          tvillage || null,
          year || null,
          fundname,
          boothno,
          status || "Active",
        ]
      );

      return res.status(201).json({
        success: true,
        fund: {
          id: result.insertId,
          taskname,
          tunion,
          tparvunion,
          tpanchayat,
          tvillage,
          year,
          fundname,
          boothno,
          status: status || "Active",
        },
        message: "Fund created successfully",
      });
    } catch (error) {
      console.error("Add fund error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/**
 * @swagger
 * /api/update-fund/{id}:
 *   put:
 *     tags: [Funds]
 *     summary: Update an existing fund
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskname:
 *                 type: string
 *               tunion:
 *                 type: string
 *               tparvunion:
 *                 type: string
 *               tpanchayat:
 *                 type: string
 *               tvillage:
 *                 type: string
 *               year:
 *                 type: string
 *               fundname:
 *                 type: string
 *               boothno:
 *                 type: integer
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Fund updated successfully
 *       404:
 *         description: Fund not found
 *       500:
 *         description: Server error
 */
app.put(
  "/api/update-fund/:id",
  authenticateToken,
  express.json({ limit: "100mb" }),
  body_parser.json({ limit: "100mb" }),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      taskname,
      tunion,
      tpartyunion,
      tpanchayat,
      tvillage,
      year,
      fundname,
      boothno,
      status,
    } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "ID is required" });
    }

    try {
      // Check if fund exists
      const rows: any = await query("SELECT * FROM funds WHERE id = ?", [id]);
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Fund not found" });
      }

      const result: any = await query(
        `UPDATE funds SET taskname = ?, tunion = ?, tparvunion = ?, tpanchayat = ?, tvillage = ?, year = ?, fundname = ?, boothno = ?, status = ? WHERE id = ?`,
        [
          taskname || rows[0].taskname,
          tunion || rows[0].tunion,
          tpartyunion || rows[0].tparvunion,
          tpanchayat || rows[0].tpanchayat,
          tvillage || rows[0].tvillage,
          year || rows[0].year,
          fundname || rows[0].fundname,
          boothno !== undefined ? boothno : rows[0].boothno,
          status || rows[0].status,
          id,
        ]
      );

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Update failed" });
      }

      return res.json({
        success: true,
        message: "Fund updated successfully",
        fund: {
          id: parseInt(id),
          taskname: taskname || rows[0].taskname,
          tunion: tunion || rows[0].tunion,
          tparvunion: tparvunion || rows[0].tparvunion,
          tpanchayat: tpanchayat || rows[0].tpanchayat,
          tvillage: tvillage || rows[0].tvillage,
          year: year || rows[0].year,
          fundname: fundname || rows[0].fundname,
          boothno: boothno !== undefined ? boothno : rows[0].boothno,
          status: status || rows[0].status,
        },
      });
    } catch (error) {
      console.error("Update fund error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/**
 * @swagger
 * /api/delete-fund/{id}:
 *   delete:
 *     tags: [Funds]
 *     summary: Delete a fund
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fund deleted successfully
 *       404:
 *         description: Fund not found
 *       500:
 *         description: Server error
 */
app.delete(
  "/api/delete-fund/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "ID is required" });
    }

    try {
      // Check if fund exists
      const rows: any = await query("SELECT * FROM funds WHERE id = ?", [id]);
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Fund not found" });
      }

      const result: any = await query("DELETE FROM funds WHERE id = ?", [id]);

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Delete failed" });
      }

      res.json({ success: true, message: "Fund deleted successfully" });
    } catch (error) {
      console.error("Delete fund error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Add this after all routes
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(); // Skip if response already sent
  console.error("Global error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// // Serve static files from the Vite build
// app.use(express.static(path.join(__dirname, "dist")));

// // For React routing to work
// app.get("/", (req, res) => {
//   res.sendFile(path.resolve(__dirname, "dist", "index.html"));
// });
// app.set("case sensitive routing", false);

/** Start server */
// app.listen(5253, () => {
//   console.log(`Server is running on http://localhost:5253`);
// });
export default app;
