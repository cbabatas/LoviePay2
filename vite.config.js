import { defineConfig } from "vite";
import paymentRequestsHandler from "./api/payment-requests.js";

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

export default defineConfig({
  server: {
    host: "127.0.0.1"
  },
  plugins: [
    {
      name: "loviepay-payment-request-api",
      configureServer(server) {
        server.middlewares.use("/api/payment-requests", async (req, res) => {
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
        });
      }
    }
  ]
});
