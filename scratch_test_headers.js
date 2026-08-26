const h = new Headers({'Content-Type': 'application/json'});
h.set('apikey', 'xyz');

const options = { headers: h };
// If something does this:
const clonedHeaders = { ...options.headers };
console.log("Cloned using spread:", clonedHeaders);

// Or this:
const mergedOptions = { ...options, headers: { ...options.headers } };
console.log("Merged options:", mergedOptions);
