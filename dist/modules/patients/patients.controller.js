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
import { Controller, Get, Patch, Body, Param, Query, Req, UseGuards, ParseUUIDPipe, DefaultValuePipe, ParseIntPipe, } from '@nestjs/common';
import { PatientsService } from './patients.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto.js';
let PatientsController = class PatientsController {
    patientsService;
    constructor(patientsService) {
        this.patientsService = patientsService;
    }
    getMyProfile(req) {
        return this.patientsService.getMyProfile(req.user.userId);
    }
    updateMyProfile(req, dto) {
        return this.patientsService.updateMyProfile(req.user.userId, dto);
    }
    getAllPatients(page, limit) {
        const safePage = Math.max(1, page);
        const safeLimit = Math.min(100, Math.max(1, limit));
        return this.patientsService.getAllPatients(safePage, safeLimit);
    }
    getPatientById(id) {
        return this.patientsService.getPatientById(id);
    }
};
__decorate([
    Get('me'),
    Roles(UserRole.PATIENT),
    UseGuards(RolesGuard),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PatientsController.prototype, "getMyProfile", null);
__decorate([
    Patch('me'),
    Roles(UserRole.PATIENT),
    UseGuards(RolesGuard),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdatePatientProfileDto]),
    __metadata("design:returntype", void 0)
], PatientsController.prototype, "updateMyProfile", null);
__decorate([
    Get(),
    Roles(UserRole.ADMIN, UserRole.RECEPTIONIST),
    UseGuards(RolesGuard),
    __param(0, Query('page', new DefaultValuePipe(1), ParseIntPipe)),
    __param(1, Query('limit', new DefaultValuePipe(10), ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], PatientsController.prototype, "getAllPatients", null);
__decorate([
    Get(':id'),
    Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR),
    UseGuards(RolesGuard),
    __param(0, Param('id', ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PatientsController.prototype, "getPatientById", null);
PatientsController = __decorate([
    Controller('patients'),
    UseGuards(JwtAuthGuard),
    __metadata("design:paramtypes", [PatientsService])
], PatientsController);
export { PatientsController };
//# sourceMappingURL=patients.controller.js.map