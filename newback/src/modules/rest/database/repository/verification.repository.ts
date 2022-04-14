import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/sequelize';
import {UserAuthModel} from '@/data/model/user.auth.model';
import {VerificationType} from '@/data/types/frontend';
import {VerificationModel} from '@/data/model/verification.model';
import {Transaction} from 'sequelize';


@Injectable()
export class VerificationRepository {
  public constructor(
    @InjectModel(UserAuthModel) private readonly userAuthModel: typeof UserAuthModel,
    @InjectModel(VerificationModel) private readonly verificationModel: typeof VerificationModel,
  ) {
  }

  public async markVerificationVerified(id: number, transaction: Transaction) {
    await this.verificationModel.update({verified: true}, {
      where: {id},
      transaction
    })
  }

  public async setUserVerification(userId: number, emailVerificationId: number, transaction: Transaction) {
    await this.userAuthModel.update({emailVerificationId}, {
      where: {id: userId},
      transaction
    })
  }


  public async getVerification(token: string, transaction?: Transaction): Promise<VerificationModel> {
    return await this.verificationModel.findOne({
      where: {token},
      include: ['user'],
      raw: true,
      transaction
    });
  }

  public async createVerification(email: string, userId: number, token: string, type: VerificationType, transaction: Transaction): Promise<void> {
    let verification = await this.verificationModel.create({
      type,
      email,
      userId,
      token,
    }, {
      raw: true,
      transaction
    });
    await this.userAuthModel.update({
      emailVerificationId: verification.id,
    }, {
      where: {
        id: userId,
      },
      transaction
    })
  }

}