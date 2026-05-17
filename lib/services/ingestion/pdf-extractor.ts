// @ts-expect-error - pdf-parse-fork doesn't provide typescript types
import pdf from "pdf-parse-fork";

function customPageRender(pageData: any) {
  return pageData.getTextContent().then(function (textContent: any) {
    // Group items by Y coordinate
    const lines = new Map<number, any[]>();
    
    for (const item of textContent.items) {
      if (!("str" in item) || (!item.str.trim() && item.str !== " ")) continue;
      
      const y = Math.round(item.transform[5]);
      let foundY = -1;
      
      // Try to find a line within 3px difference to account for slight misalignments
      for (const existingY of lines.keys()) {
        if (Math.abs(existingY - y) <= 3) {
          foundY = existingY;
          break;
        }
      }
      
      if (foundY !== -1) {
        lines.get(foundY)!.push(item);
      } else {
        lines.set(y, [item]);
      }
    }
    
    // Sort Y descending (top to bottom)
    const sortedY = Array.from(lines.keys()).sort((a, b) => b - a);
    let fullText = "";

    for (const y of sortedY) {
      const items = lines.get(y)!;
      // Sort X ascending (left to right)
      items.sort((a, b) => a.transform[4] - b.transform[4]);
      
      let lineStr = "";
      let lastEndX = -1;
      
      for (const item of items) {
        const x = item.transform[4];
        
        if (lastEndX !== -1) {
          const gap = x - lastEndX;
          if (gap > 30) {
            lineStr += " \t| "; // large gap, likely a column separation
          } else if (gap > 5) {
            lineStr += " "; // normal space
          }
        }
        
        lineStr += item.str;
        lastEndX = x + (item.width || item.str.length * 5); 
      }
      
      fullText += lineStr + "\n";
    }
    
    return fullText + "\n---\n\n";
  });
}

export async function extractStructuredText(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer, {
    pagerender: customPageRender
  });
  return data.text;
}
