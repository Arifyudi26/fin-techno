import dynamic from 'next/dynamic';
import Head from 'next/head';
import { openApiSpec } from '@/lib/openapi';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocs() {
  return (
    <>
      <Head>
        <title>Fin-Techno API Docs</title>
        <meta name="description" content="Fin-Techno REST API documentation" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
        />
      </Head>
      <div style={{ minHeight: '100vh', background: '#fafafa' }}>
        <SwaggerUI
          spec={openApiSpec}
          docExpansion="list"
          defaultModelsExpandDepth={-1}
          tryItOutEnabled={true}
          persistAuthorization={true}
        />
      </div>
    </>
  );
}
