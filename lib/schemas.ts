import { Type } from "@google/genai";
import {z} from "zod";

export const questionSchema = 
{
    type: Type.OBJECT,
    properties: {
    pertanyaan: {type: Type.STRING},
    opsi: {type: Type.ARRAY, items: {type: Type.STRING}},
    indeksBenar: {type: Type.INTEGER},
    penjelasan: {type: Type.STRING},
    kutipanBukti: {type: Type.STRING}
    },
    required: ["pertanyaan", "opsi" , "indeksBenar" , "penjelasan" , "kutipanBukti"],
};

export const questionZ = z.object({
  pertanyaan: z.string().min(10).max(400),
  opsi: z.array(z.string()).length(4),
  indeksBenar: z.number().int().min(0).max(3),
  penjelasan: z.string().min(5),
  kutipanBukti: z.string().min(5),
});

