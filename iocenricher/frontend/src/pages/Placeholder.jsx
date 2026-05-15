import { C } from "../lib/theme";
import { Card, PageHeader } from "../components/UI";
import Icon from "../components/Icon";

export default function Placeholder({ pageName }) {
  return (
    <>
      <PageHeader
        title={pageName}
        subtitle="This page is under construction."
      />
      <Card style={{ padding: "80px 40px", textAlign: "center" }}>
        <div style={{ marginBottom: 16 }}>
          <Icon name="layers" size={48} color={C.textDim} />
        </div>
        <h3 style={{ fontSize: 16, color: C.text, margin: 0, marginBottom: 8 }}>Coming soon</h3>
        <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
          The {pageName} page will be available shortly.
        </p>
      </Card>
    </>
  );
}
