declare global {
    interface Window { __ENV__: Environment; }
}

export default interface Environment {
    baseUrl: string;
    apiBaseUrl: string;
    attributes?: {[name: string]: any};
}