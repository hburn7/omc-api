import fastify from "fastify";
import { fetchBeatmaps } from "./src/lib/client.ts";
import * as validator from "./src/lib/validator.ts";
import type { ValidationResult } from "./src/lib/dataTypes.ts";

const server = fastify();

const validateOpts = {
  schema: {
    body: {
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "integer",
            },
          },
        },
      },
    },
  },
};

server.post("/validate", validateOpts, async (request, reply) => {
  const chunkSize = 50;
  const beatmapIds = request.body as number[];
  const allResults: ValidationResult[] = [];
  const secret = process.env.API_KEY_SECRET!;
  const providedSecret = request.headers['x-api-key']

  if (secret !== providedSecret) {
    reply
      .code(401)
      .send({ message: 'Unauthorized' })
  }
  
  for (let i = 0; i < beatmapIds.length; i += chunkSize) {
    const chunk = beatmapIds.slice(i, i + chunkSize);
    const beatmaps = await fetchBeatmaps(chunk);
    
    // Validate beatmaps and get results per beatmapset
    const results = validator.validate(beatmaps);
    allResults.push(...results);
  }
  
  return allResults;
});

server.listen({ port: 8080 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});