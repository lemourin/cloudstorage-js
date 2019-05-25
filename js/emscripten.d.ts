declare namespace Module {
    var onRuntimeInitialized: { (): Promise<void> };
}

declare function addFunction(f: any, type: string): number;
declare function removeFunction(f: number): void;
