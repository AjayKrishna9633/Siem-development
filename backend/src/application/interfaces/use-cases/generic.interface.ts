export 
type Input= {
name:string
}

export type Output= {
name:string
}

export interface IGenericUseCase< Input, Output>{
   execute(input:Input):Promise<Output> | Output;
}