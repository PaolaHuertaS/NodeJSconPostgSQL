import { IsString, IsNumber, MinLength, IsPositive } from 'class-validator';

export class CreateGraphqlDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(2)
  author: string;

  @IsNumber()
  @IsPositive()
  price: number;
}