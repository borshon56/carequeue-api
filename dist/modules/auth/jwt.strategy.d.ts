import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { DataSource } from 'typeorm';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly dataSource;
    constructor(configService: ConfigService, dataSource: DataSource);
    validate(payload: {
        sub: string;
    }): Promise<{
        userId: string;
        fullName: string;
        email: string;
        role: import("../../common/enums/user-role.enum.js").UserRole;
    }>;
}
export {};
