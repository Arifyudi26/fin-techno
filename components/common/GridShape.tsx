import GridSvg from "@/public/images/shape/grid-01.svg";

export default function GridShape() {
  return (
    <>
      <div className="absolute right-0 top-0 z-0 w-full max-w-[250px] xl:max-w-[450px] pointer-events-none">
        <GridSvg width={450} height={450} />
      </div>
      <div className="absolute bottom-0 left-0 z-0 w-full max-w-[250px] rotate-180 xl:max-w-[450px] pointer-events-none">
        <GridSvg width={450} height={450} />
      </div>
    </>
  );
}
