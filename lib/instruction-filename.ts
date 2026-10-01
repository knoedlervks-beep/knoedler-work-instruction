export function instructionFilename(d:{customerPart?:string;customerRev?:string;operation?:string}){
 const part=d.customerPart?.trim();
 if(!part)throw new Error('Enter Customer Part # before exporting the PDF.');
 return `${part}_Rev-${d.customerRev?.trim()||'NA'}_${d.operation||'Instruction'}.pdf`.replace(/[\\/\u0000-\u001f:*?"<>|]/g,'-');
}
