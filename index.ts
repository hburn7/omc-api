import fastify from "fastify";
import { fetchBeatmaps } from "./src/lib/client.ts";
import * as validator from "./src/lib/validator.ts";
import { type ValidationResult } from "./src/lib/dataTypes.ts";

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
  let allFailures: Set<number> = new Set<number>();

  const secret = process.env.API_KEY_SECRET!;
  const providedSecret = request.headers["x-api-key"];

  if (secret !== providedSecret) {
    console.log('[401] Unauthorized request received')
    reply.code(401).send({ message: "Unauthorized" });
  }

  for (let i = 0; i < beatmapIds.length; i += chunkSize) {
    const chunk = beatmapIds.slice(i, i + chunkSize);
    const fetchResult = await fetchBeatmaps(chunk);
    allFailures = allFailures.union(new Set(fetchResult.failures));

    // Validate beatmaps and get results per beatmapset
    const results = validator.validate(fetchResult.beatmaps);
    allResults.push(...results);
  }

  const resultStatuses = allResults.reduce((acc, result) => {
    acc[result.complianceStatusString] = (acc[result.complianceStatusString] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`[200] Authorized request received [ ${JSON.stringify(resultStatuses)} | ${allFailures.size} failure(s)]`)

  return {
    results: allResults,
    failures: Array.from(allFailures)
  };
});

server.listen({ port: 8080 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
