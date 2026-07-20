import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const projectDir = path.resolve(backendDir, "..");
const pythonPath = process.env.PYTHON_PATH || path.join(projectDir, ".venv", "Scripts", "python.exe");
const predictScript = path.join(backendDir, "inference", "predict_traits.py");

export function predictPhenotypeFromSnp(profile = {}) {
  return new Promise((resolve, reject) => {
    const jsonInput = JSON.stringify(profile);
    const child = spawn(pythonPath, [predictScript, "--profile-json", jsonInput]);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`predict_traits.py failed with code ${code}: ${stderr}`));
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse predict_traits output: ${err.message}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}
