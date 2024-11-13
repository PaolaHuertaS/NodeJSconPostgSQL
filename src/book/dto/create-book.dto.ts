import { IsString, IsNumber, MinLength, IsPositive } from 'class-validator';

export class CreateBookDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(3)
  author: string;

  @IsNumber()
  @IsPositive()
  price: number;
}
