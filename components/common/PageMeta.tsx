import Head from "next/head";

const PageMeta = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <Head>
    <title>{title}</title>
    <meta name="description" content={description} />
  </Head>
);

export default PageMeta;
