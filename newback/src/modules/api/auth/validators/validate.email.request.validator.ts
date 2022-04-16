import {
  IsEmail,
  IsString,
} from "class-validator";
import type {ValidateUserEmailRequest} from "@/data/types/frontend";

export class ValidateEmailRequestValidator implements ValidateUserEmailRequest {
  @IsString()
  @IsEmail()
  public email: string;
}
