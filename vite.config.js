import { defineConfig, loadEnv } from "vite";
import paymentRequestsHandler from "./api/payment-requests.js";
import customerAccountsHandler from "./api/customer-accounts.js";

const SERVER_ENV_KEYS = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

function createMockResponse(resolve) {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(body) {
      resolve({
        statusCode: this.statusCode,
        headers: this.headers,
        body
      });
    }
  };
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function applyServerEnv(mode) {
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of SERVER_ENV_KEYS) {
    if (!process.env[key] && env[key]) {
      process.env[key] = env[key];
    }
  }
}

function sendJsonError(res, error) {
  res.statusCode = 500;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      error: {
        code: "request_creation_failed",
        message: error?.message || "The request could not be completed. Try again."
      }
    })
  );
}

export default defineConfig(({ mode }) => {
  applyServerEnv(mode);

  return {
    server: {
      host: "127.0.0.1"
    },
    plugins: [
      {
        name: "loviepay-payment-request-api",
        configureServer(server) {
          server.middlewares.use("/api/payment-requests", async (req, res) => {
            try {
              const result = await new Promise(async (resolve, reject) => {
                try {
                  req.body = await readRawBody(req);
                  await paymentRequestsHandler(req, createMockResponse(resolve));
                } catch (error) {
                  reject(error);
                }
              });

              for (const [name, value] of Object.entries(result.headers)) {
                res.setHeader(name, value);
              }
              res.statusCode = result.statusCode;
              res.end(result.body);
            } catch (error) {
              server.config.logger.error(`[API ERROR] ${error?.message ?? error}\n${error?.stack ?? ""}`);
              sendJsonError(res, error);
            }
          });

          server.middlewares.use("/api/customer/accounts", async (req, res) => {
            try {
              const result = await new Promise(async (resolve, reject) => {
                try {
                  await customerAccountsHandler(req, createMockResponse(resolve));
                } catch (error) {
                  reject(error);
                }
              });

              for (const [name, value] of Object.entries(result.headers)) {
                res.setHeader(name, value);
              }
              res.statusCode = result.statusCode;
              res.end(result.body);
            } catch (error) {
              server.config.logger.error(`[API ERROR] ${error?.message ?? error}\n${error?.stack ?? ""}`);
              sendJsonError(res, error);
            }
          });
        }
      }
    ]
  };
});
