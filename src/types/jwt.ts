interface JwtPayload {
    username: string;
    iat?: number;
    exp?: number;
}

export type {JwtPayload};