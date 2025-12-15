
const { z } = require('zod');

try {
    console.log('Testing basic Zod string...');
    const schema = z.string();
    const res = schema.parse("hello");
    console.log("Basic Zod works:", res);

    console.log('Testing object...');
    const obj = z.object({ name: z.string() });
    const res2 = obj.parse({ name: "world" });
    console.log("Object works:", res2);
} catch (e) {
    console.error("Zod basic failed:", e);
}
