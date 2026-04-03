/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

declare module "sweetalert2/dist/sweetalert2.min.css" {
  const content: any;
  export default content;
}

declare module "*.svg" {
  import type React from "react";
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
