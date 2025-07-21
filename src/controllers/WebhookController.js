import { ErrorExtractor } from "../../utils/ErrorHandler"


export const webHook = async(req,res)=>{
    try {
        console.log('req',req.body)
    } catch (error) {
        console.error('Error',ErrorExtractor(error));
    }
}