// Retain photos and annotations from instructions saved before multi-photo support.
export function stepPhotos(step:any):any[]{return Array.isArray(step.photos)?step.photos:step.image?[{id:step.id+'-photo',image:step.image,annotations:step.annotations||[]}]:[];}
