var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Patch, Post, Body, Param, Query, Req, UseGuards, ParseUUIDPipe, DefaultValuePipe, ParseIntPipe, } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
let UsersController = class UsersController {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    getProfile(req) {
        return this.usersService.getProfile(req.user.userId);
    }
    updateProfile(req, dto) {
        return this.usersService.updateProfile(req.user.userId, dto);
    }
    getAllUsers(page, limit) {
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(100, Math.max(1, limit));
        return this.usersService.getAllUsers(safePage, safeLimit);
    }
    createStaff(dto) {
        return this.usersService.createStaff(dto);
    }
    updateRole(id, dto, req) {
        return this.usersService.updateRole(id, dto, req.user.userId);
    }
    deactivateUser(id, req) {
        return this.usersService.deactivateUser(id, req.user.userId);
    }
};
__decorate([
    Get('me'),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getProfile", null);
__decorate([
    Patch('me'),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdateProfileDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateProfile", null);
__decorate([
    Get(),
    UseGuards(RolesGuard),
    Roles(UserRole.ADMIN),
    __param(0, Query('page', new DefaultValuePipe(1), ParseIntPipe)),
    __param(1, Query('limit', new DefaultValuePipe(10), ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getAllUsers", null);
__decorate([
    Post('staff'),
    UseGuards(RolesGuard),
    Roles(UserRole.ADMIN),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateStaffDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "createStaff", null);
__decorate([
    Patch(':id/role'),
    UseGuards(RolesGuard),
    Roles(UserRole.ADMIN),
    __param(0, Param('id', ParseUUIDPipe)),
    __param(1, Body()),
    __param(2, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateRoleDto, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateRole", null);
__decorate([
    Patch(':id/deactivate'),
    UseGuards(RolesGuard),
    Roles(UserRole.ADMIN),
    __param(0, Param('id', ParseUUIDPipe)),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "deactivateUser", null);
UsersController = __decorate([
    Controller('users'),
    UseGuards(JwtAuthGuard),
    __metadata("design:paramtypes", [UsersService])
], UsersController);
export { UsersController };
//# sourceMappingURL=users.controller.js.map