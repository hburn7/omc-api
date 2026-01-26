import fastify from "fastify";
import { fetchBeatmaps } from "./src/lib/client.ts";
import * as validator from "./src/lib/validator.ts";
import { type ValidationResult, type RawMetadataInput } from "./src/lib/dataTypes.ts";
import { logger } from "./src/lib/logger.ts";

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

  if (!secret) {
    logger.error("API key secret missing from environment configuration");
    reply.code(500).send({ message: "Server misconfigured" });
    return;
  }

  if (secret !== providedSecret) {
    logger.warn("Unauthorized request received", {
      ip: request.ip,
    });
    reply.code(401).send({ message: "Unauthorized" });
    return;
  }

  logger.debug("Processing validation request", {
    beatmapCount: beatmapIds.length,
  });

  for (let i = 0; i < beatmapIds.length; i += chunkSize) {
    const chunk = beatmapIds.slice(i, i + chunkSize);
    logger.debug("Fetching beatmap chunk", { startIndex: i, chunkSize: chunk.length });
    const fetchResult = await fetchBeatmaps(chunk);
    logger.debug("Fetched beatmap chunk", {
      startIndex: i,
      fetchedCount: fetchResult.beatmaps.length,
      failures: fetchResult.failures,
    });
    allFailures = allFailures.union(new Set(fetchResult.failures));

    // Validate beatmaps and get results per beatmapset
    const results = validator.validate(fetchResult.beatmaps);
    allResults.push(...results);
  }

  const resultStatuses = allResults.reduce((acc, result) => {
    acc[result.complianceStatusString] = (acc[result.complianceStatusString] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  logger.info("Completed validation request", {
    statusCounts: resultStatuses,
    failureCount: allFailures.size,
  });

  return {
    results: allResults,
    failures: Array.from(allFailures)
  };
});

const validateMetadataOpts = {
  schema: {
    body: {
      content: {
        "application/json": {
          schema: {
            type: "array",
            maxItems: 1000,
            items: {
              type: "object",
              required: ["artist", "title"],
              properties: {
                artist: { type: "string" },
                title: { type: "string" },
                isFeaturedArtist: { type: "boolean" },
                status: { type: "string" },
                source: { type: "string" },
                tags: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};

server.post("/validate-metadata", validateMetadataOpts, async (request, reply) => {
  const secret = process.env.API_KEY_SECRET!;
  const providedSecret = request.headers["x-api-key"];

  if (!secret) {
    logger.error("API key secret missing from environment configuration");
    reply.code(500).send({ message: "Server misconfigured" });
    return;
  }

  if (secret !== providedSecret) {
    logger.warn("Unauthorized request received", {
      ip: request.ip,
    });
    reply.code(401).send({ message: "Unauthorized" });
    return;
  }

  const inputs = request.body as RawMetadataInput[];

  logger.debug("Processing metadata validation request", {
    count: inputs.length,
  });

  const results = inputs.map((input) => validator.validateRawMetadata(input));

  const resultStatuses = results.reduce((acc, result) => {
    acc[result.complianceStatusString] = (acc[result.complianceStatusString] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  logger.info("Completed metadata validation request", {
    count: inputs.length,
    statusCounts: resultStatuses,
  });

  return results;
});

server.listen({ port: 8080 }, (err, address) => {
  if (err) {
    logger.error("Failed to start server", { error: err });
    process.exit(1);
  }
  logger.info("Server listening", { address });
});
