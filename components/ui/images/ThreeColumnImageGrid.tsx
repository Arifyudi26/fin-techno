import Image from "next/image";

export default function ThreeColumnImageGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <div>
        <Image
          src="/images/grid-image/image-04.png"
          alt="grid"
          width={400}
          height={300}
          className="border border-gray-200 rounded-xl dark:border-gray-800"
        />
      </div>

      <div>
        <Image
          src="/images/grid-image/image-05.png"
          alt="grid"
          width={400}
          height={300}
          className="border border-gray-200 rounded-xl dark:border-gray-800"
        />
      </div>

      <div>
        <Image
          src="/images/grid-image/image-06.png"
          alt="grid"
          width={400}
          height={300}
          className="border border-gray-200 rounded-xl dark:border-gray-800"
        />
      </div>
    </div>
  );
}
