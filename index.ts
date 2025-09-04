import fastify from "fastify";
import { fetchBeatmaps } from "./src/lib/client.ts";
import * as validator from "./src/lib/validator.ts";

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

  for (let i = 0; i < beatmapIds.length; i += chunkSize) {
    const chunk = beatmapIds.slice(i, i + chunkSize);
    const data = await fetchBeatmaps(chunk);

    const validation = validator.

    console.log(data);
  }
});

server.listen({ port: 8080 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
