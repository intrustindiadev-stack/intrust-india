const { z } = require('zod');

const dt = z.object({
  message: z.string(),
  locations: z.array(z.object({ line: z.number(), column: z.number() }))
});

const mt = z.object({
  data: z.record(z.string(), z.unknown()),
  errors: z.undefined()
});

const gt = z.object({
  data: z.undefined(),
  errors: z.array(dt)
});

const ht = z.union([mt, gt]);

const response = {"errors":[{"message":"Quota exceeded"}]};

console.log('Testing response:', JSON.stringify(response));
const result = ht.safeParse(response);

if (result.success) {
  console.log('Success!');
} else {
  console.log('Failed!');
  console.log(JSON.stringify(result.error, null, 2));
}
