// Lazy geometry for the region diagrams. The drawings are generated from landmarks (smoothed outlines, muscle sheets,
// fibre lines…), which costs noticeable time on a phone. Every module-level piece of geometry is wrapped in `once()`:
// it is built the first time a view that uses it renders, then reused — so loading the diagrams chunk costs almost
// nothing and opening one figure builds only that view's paths.

/** A memoised thunk: `f` runs on the first call only; later calls return the same value. */
export function once<T>(f: () => T): () => T {
  let done = false;
  let v: T;
  return () => {
    if (!done) {
      v = f();
      done = true;
    }
    return v;
  };
}
