/** Browser-only Mammoth entrypoint shares the library's raw-text API types. */
declare module 'mammoth/mammoth.browser' {
  const mammoth: typeof import('mammoth');
  export default mammoth;
}
