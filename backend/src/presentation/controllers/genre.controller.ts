import {inject,injectable} from 'inversify'
import TYPES from '../../domain/constants/types.js';
import type {Request,Response} from 'express'
import type {IGenericUseCase} from '../../application/interfaces/use-cases/generic.interface.js';

@injectable()
export class GenreController<T>{

    constructor(
        @inject(TYPES.GenericUseCase)
        private readonly genreUseCase:IGenericUseCase<any,any>
    ){}

    createGenre = async (req:Request,res:Response)=>{
        try{
            const {name} = req.body;

            await this.genreUseCase.execute({name:name});
            res.status(201).json({message:"success",status:201})
        }catch(error){
            res.status(500).json({message:"suceesss"})
        }
    }
}
