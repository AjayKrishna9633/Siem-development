import type { Input, Output, IGenericUseCase } from "../interfaces/use-cases/generic.interface.js"
import { inject, injectable } from "inversify";


@injectable()
export class GenericUseCase implements IGenericUseCase<Input, Output> {
    async execute(input: Input): Promise<Output> {

        console.log(`this is the new  gener${input.name}`)

        return {
          
            name: input.name
        }
    }
}