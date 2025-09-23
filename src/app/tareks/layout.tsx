"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Layout, Typography } from "antd";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

export default function TareksLayout({ children }: { children: ReactNode }) {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={240}
        theme="light"
        className="tareks-sider"
        style={{ padding: 12, display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div className="tareks-sider-logo">TP</div>
          <Text className="tareks-sider-title">Tareks Portal</Text>
          <Text type="secondary" className="tareks-sider-sub">Hizli erisim menusu</Text>
        </div>

        <nav style={{ display: "grid", gap: 8 }}>
          <Link href="/tareks" className="tareks-menu-link">Tareks Listesi</Link>
        </nav>

        <div style={{ marginTop: 12 }}>
          <Text className="tareks-section-label" type="secondary">
            Kalem islemleri
          </Text>
        </div>
        <div id="sidebar-aux" className="tareks-sidebar-aux" />
      </Sider>

      <Layout>
        <Header
          style={{
            background: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            height: "auto",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text className="tareks-header-title">Tareks</Text>
          <Text type="secondary"></Text>
        </Header>
        <Content style={{ padding: 24, background: "#f8fafc" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
