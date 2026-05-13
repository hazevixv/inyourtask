declare const beforeAll: (fn: (...args: any[]) => any, timeout?: number) => void;
declare const beforeEach: (fn: (...args: any[]) => any, timeout?: number) => void;
declare const afterAll: (fn: (...args: any[]) => any, timeout?: number) => void;
declare const afterEach: (fn: (...args: any[]) => any, timeout?: number) => void;
declare const describe: (name: string, fn: () => void) => void;
declare const test: (name: string, fn: () => any) => void;
declare const it: (name: string, fn: () => any) => void;
declare const expect: any;
declare const jest: {
  fn: (...args: any[]) => any;
  spyOn: (...args: any[]) => any;
  clearAllMocks: () => void;
  resetAllMocks: () => void;
  restoreAllMocks: () => void;
};
