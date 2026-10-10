import {inject,injectable} from 'inversify';
import type {IGenericRepository} from '../../../application/interfaces/repositories/IGenereRepository.interface.js'
import TYPES from '../../../domain/constants/types.js'
import  {DataSource} from 'typeorm'
@injectable()
export class GenreRepository<T> implements IGenericRepository<T>{
    constructor(@inject(TYPES.DataSource) private db : DataSource){}

    async save(input:any){
      console.log(`is is actually saving to the database`);
      await this.db.manager.save({name:input.name});
      return {name:input.name


































































        
      }
    }
    
}