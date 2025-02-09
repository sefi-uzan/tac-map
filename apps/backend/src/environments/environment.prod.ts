export const environment = {
    production: true,
    port: process.env.PORT || 3000,
    cors: {
        origin: '*', // In production, you might want to restrict this
    }
}; 