"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Layout, Typography, Button, Tooltip } from "antd";
import { usePathname } from "next/navigation";
import { MenuFoldOutlined, MenuUnfoldOutlined, PushpinOutlined, PushpinFilled } from "@ant-design/icons";

const { Sider, Content } = Layout;
const { Text } = Typography;

export default function TareksLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [pinned, setPinned] = useState<boolean>(false);

  const showKalemIslemleri =
    !!pathname &&
    /\/tareks\/dosya\/[^/]+\/kalemler\/(edit|fill)(\/)?$/i.test(pathname);

  // load persisted states
  useEffect(() => {
    try {
      const v = localStorage.getItem("tareks.sider.collapsed");
      if (v != null) setCollapsed(v === "1");
      const pin = localStorage.getItem("tareks.sider.pinned");
      if (pin != null) setPinned(pin === "1");
    } catch {}
  }, []);

  // persist states
  useEffect(() => {
    try { localStorage.setItem("tareks.sider.collapsed", collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);
  useEffect(() => {
    try { localStorage.setItem("tareks.sider.pinned", pinned ? "1" : "0"); } catch {}
  }, [pinned]);

  // Detay (dosya) sayfası: /tareks/dosya/[id]
  const isDosyaPage = !!pathname && /^\/tareks\/dosya\/[^/]+\/?$/.test(pathname);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        theme="light"
        width={240}
        collapsedWidth={60}
        collapsible
        trigger={null}
        collapsed={collapsed}
        breakpoint="lg"
        onBreakpoint={(broken) => broken && setCollapsed(true)}
        className={`tareks-sider ${collapsed ? "collapsed" : ""} ${pinned ? "pinned" : ""}`}
        style={{
          padding: 12,
          height: "100vh",        // SIDER sabit viewport yüksekliği
          position: "relative",   // alt bar için referans
          overflow: "hidden",     // iç scroll'u aşağıdaki wrapper alır
          paddingBottom: 56       // alt bar yüksekliği kadar iç boşluk
        }}
      >
        <div className="sider-inner">
          {!collapsed && (
            <div style={{ padding: "6px 6px" }}>
              <Text className="tareks-sider-title">Üniversal Eğitim ve Danışmanlık A.Ş.</Text>
            </div>
          )}

          <nav style={{ display: "grid", gap: 6 }}>
            <a href="/tareks" className="tareks-menu-link">
              <span className="icon">📄</span>
              <span className="label">Tareks Listesi</span>
            </a>
          </nav>

          {showKalemIslemleri && <div id="sidebar-aux" className="tareks-sidebar-aux" />}
        </div>

        {/* Alt sabit kontrol çubuğu – her zaman görünür */}
        <div className="sider-controls">
          <Button
            type="text"
            onClick={() => setCollapsed((c) => !c)}
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          />
          <Button
            className="pin-btn"
            type="text"
            onClick={() => setPinned((p) => !p)}
            icon={pinned ? <PushpinFilled /> : <PushpinOutlined />}
          >
            <span className="label">{pinned ? "Sabit" : "Sabitle"}</span>
          </Button>
        </div>
      </Sider>

      <Layout>
        <Content
          className={`tareks-content ${isDosyaPage ? "tareks-content--dosya" : ""}`}
          style={{ padding: 12, background: "#f8fafc" }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
