import multer from "multer";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";

const storage = multer.diskStorage({
    destination: tmpdir(),
    filename: (_req, _file, callback) => callback(null, randomUUID()),
});

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 * 1024 },
});
