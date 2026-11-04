/** Vercel Node.js entrypoint; all generation logic remains independently testable. */
import { handleGeneration } from '../server/generationHandler';

export default { fetch: (request: Request) => handleGeneration(request) };
