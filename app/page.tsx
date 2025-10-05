"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Select,
  Space,
  Spin,
  Typography,
  message,
} from "antd";
import type { SelectProps } from "antd";
import type { CoreSchemaType } from "@/app/utils/type";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import Image from "next/image";

const { Title, Paragraph, Text } = Typography;

const CATEGORY_OPTIONS: SelectProps["options"] = [
  "Applications/dApps",
  "Community & Coordination",
  "Developer tools",
  "Hubs",
  "Infrastructure",
  "Security & Privacy",
  "Storage & Data",
  "Events",
  "Local Communities",
  "Other",
].map((value) => ({ label: value, value }));

const DEV_STATUS_OPTIONS: SelectProps["options"] = [
  "Idea/Whitepaper",
  "Prototype",
  "In development",
  "Alpha",
  "Beta",
  "Broken / Abandoned",
  "Concept",
  "Stealth",
  "Active Community",
].map((value) => ({ label: value, value }));

const ORG_STRUCTURE_OPTIONS: SelectProps["options"] = [
  "For-Profit Company",
  "Non-Profit Organization / Association",
  "Foundation",
  "Cooperative",
  "DAO",
  "Federated DAO / SubDAO",
  "Project within a DAO",
  "Anonymous Collective",
  "Sole Developer",
  "University / Academic-Led Initiative",
  "Public-Private Partnership",
  "Community-Led Initiative (no legal entity)",
  "Hybrid Structure (e.g. Company + DAO)",
  "Evolving Structure",
].map((value) => ({ label: value, value }));

const BOOLEAN_OPTIONS: SelectProps["options"] = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

const mapBooleanToOptionValue = (value: unknown) => {
  if (typeof value !== "boolean") {
    return undefined;
  }

  return value ? "true" : "false";
};

const mapOptionValueToBoolean = (value: unknown) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  return value === "true";
};

const mapDateStringToPickerValue = (value: unknown): Dayjs | undefined => {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : undefined;
};

const mapPickerValueToDateString = (value: unknown) => {
  if (!value || !dayjs.isDayjs(value)) {
    return null;
  }

  return value.toDate().toISOString();
};

interface RootDataSearchResult {
  id: string;
  name: string;
  introduce: string | null;
  logo: string | null;
}

interface FounderFormValue {
  name: string;
  title: string;
  region?: string;
}

type ProjectFillResponse = CoreSchemaType & {
  name: string | null;
  tagline?: string | null;
  mainDescription?: string | null;
  logoUrl?: string | null;
  websites?: Array<{ url?: string | null; title?: string | null }>;
  rootdataurl?: string | null;
  tags?: string[] | null;
  fundingStatus?: boolean | null;
};

type ProjectFillFormValues = CoreSchemaType & {
  name?: string | null;
  tagline?: string | null;
  mainDescription?: string | null;
  founders: FounderFormValue[];
  codeRepo: string | null;
  logoUrl?: string | null;
  rootdataurl?: string | null;
  tags?: string[] | null;
  websites?: Array<{ url?: string | null; title?: string | null }>;
  fundingStatus?: boolean | null;
};

interface ProjectSubmitPayload {
  name: string;
  tagline: string;
  categories: string[];
  mainDescription: string;
  logoUrl: string;
  websites: { title: string; url: string }[];
  appUrl: string | null;
  dateFounded: string;
  dateLaunch: string | null;
  devStatus: string;
  fundingStatus: string | null;
  openSource: boolean;
  codeRepo: string | null;
  tokenContract: string | null;
  orgStructure: string;
  publicGoods: boolean;
  founders: { name: string; title: string; region?: string }[];
  tags: string[];
  whitePaper: string | null;
  dappSmartContracts: { id: string; chain: string; addresses: string }[] | null;
  refs: { key: string; value: string }[] | null;
}

export default function Home() {
  const [form] = Form.useForm<ProjectFillFormValues>();
  const [keyword, setKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<RootDataSearchResult[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [fillLoading, setFillLoading] = useState(false);
  const [selectedResult, setSelectedResult] =
    useState<RootDataSearchResult | null>(null);
  const [fillData, setFillData] = useState<ProjectFillResponse | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [submitting, setSubmitting] = useState(false);

  const emptyFounder = useMemo<FounderFormValue>(
    () => ({ name: "", title: "", region: "" }),
    []
  );
  const emptyWebsite = useMemo<{ url: string; title: string }>(
    () => ({ url: "", title: "" }),
    []
  );

  useEffect(() => {
    if (fillData) {
      form.setFieldsValue({
        ...fillData,
        categories: Array.isArray(fillData.categories)
          ? fillData.categories
          : [],
        codeRepo: fillData.codeRepo,
        founders:
          Array.isArray(fillData.founders) && fillData.founders.length > 0
            ? fillData.founders
            : [emptyFounder],
        websites:
          Array.isArray(fillData.websites) && fillData.websites.length > 0
            ? fillData.websites.map((site) => ({
                url: typeof site?.url === "string" && site.url ? site.url : "",
                title:
                  typeof site?.title === "string" && site.title
                    ? site.title
                    : "",
              }))
            : [{ ...emptyWebsite }],
        tags: Array.isArray(fillData.tags) ? fillData.tags : [],
      });
    } else {
      form.resetFields();
    }
  }, [fillData, form, emptyFounder, emptyWebsite]);

  const handleSearch = async (value?: string) => {
    const query = typeof value === "string" ? value : keyword;
    if (!query.trim()) {
      messageApi.warning("Please enter a search keyword.");
      return;
    }

    setSearching(true);
    try {
      const params = new URLSearchParams({ q: query.trim() });
      const response = await fetch(`/api/projectSearch?${params.toString()}`);
      if (!response.ok) {
        const errorBody = await safeJson(response);
        const messageText =
          errorBody?.error ?? "Search failed. Please try again later.";
        throw new Error(messageText);
      }
      const data = await response.json();
      setResults(Array.isArray(data?.results) ? data.results : []);
      if (!Array.isArray(data?.results) || data.results.length === 0) {
        messageApi.info(
          "No matching projects were found. Try another keyword."
        );
      } else {
        messageApi.success(
          "Search complete. Click a project to open the details."
        );
      }
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : String(error);
      messageApi.error(messageText);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectProject = async (item: RootDataSearchResult) => {
    setSelectedResult(item);
    setModalVisible(true);
    setFillLoading(true);
    try {
      const response = await fetch("/api/projectFill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: item.id }),
      });

      if (!response.ok) {
        const errorBody = await safeJson(response);
        const messageText =
          errorBody?.error ?? "Failed to fetch project details.";
        throw new Error(messageText);
      }

      const data: ProjectFillResponse = await response.json();
      setFillData({
        ...data,
        codeRepo: data.codeRepo,
        founders:
          Array.isArray(data.founders) && data.founders.length > 0
            ? data.founders
            : [emptyFounder],
      });
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : String(error);
      messageApi.error(messageText);
      setModalVisible(false);
      setSelectedResult(null);
      setFillData(null);
    } finally {
      setFillLoading(false);
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setSelectedResult(null);
    setFillData(null);
    form.resetFields();
  };

  const handleModalOk = async () => {
    if (!fillData) {
      messageApi.error("Please load project data before submitting.");
      return;
    }

    try {
      const values = await form.validateFields();
      const submissionPayload = buildSubmissionPayload(values, {
        fillData,
        selectedResult,
      });

      setSubmitting(true);

      const response = await fetch("/api/projectSubmit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: submissionPayload }),
      });

      if (!response.ok) {
        const errorBody = await safeJson(response);
        const errorMessage =
          errorBody?.error ?? "Project submission failed. Please try again.";
        throw new Error(errorMessage);
      }

      const data = await response.json();
      messageApi.success(
        data?.projectId
          ? `Project submitted successfully (ID: ${data.projectId}).`
          : "Project submitted successfully."
      );
      handleModalCancel();
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : String(error);
      messageApi.error(messageText);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      style={{
        padding: "32px",
        backgroundColor: "#f5f7fa",
        minHeight: "100vh",
      }}
    >
      {contextHolder}
      <section
        style={{
          maxWidth: 960,
          margin: "0 auto",
          backgroundColor: "#fff",
          padding: "32px",
          borderRadius: 12,
          boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
        }}
      >
        <Title level={2} style={{ marginBottom: 16 }}>
          Pensieve Project Assistant
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 24 }}>
          Search name for a project, select one from the results, and the system
          will fetch fill data so you can review and adjust the form in the
          modal.
        </Paragraph>
        <Paragraph type="warning" style={{ marginBottom: 16 }}>
          The system allows up to 60 queries per hour; both searches and project
          selections count.
        </Paragraph>

        <Input.Search
          placeholder="Enter a project name or keyword"
          enterButton="Search"
          size="large"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          loading={searching}
          onSearch={handleSearch}
        />

        <Divider />

        <List<RootDataSearchResult>
          bordered
          loading={searching}
          dataSource={results}
          locale={{ emptyText: <Empty description="No search results" /> }}
          renderItem={(item) => (
            <List.Item
              key={item.id}
              onClick={() => handleSelectProject(item)}
              style={{ cursor: "pointer" }}
            >
              <List.Item.Meta
                avatar={
                  item.logo ? (
                    <Avatar src={item.logo} alt={item.name} />
                  ) : (
                    <Avatar>
                      {item.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </Avatar>
                  )
                }
                title={
                  <Space direction="horizontal" size={8}>
                    <Text strong>{item.name}</Text>
                  </Space>
                }
                description={
                  item.introduce ? (
                    <Paragraph style={{ marginBottom: 0 }}>
                      {item.introduce}
                    </Paragraph>
                  ) : (
                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                      No description provided. Click to load additional details.
                    </Paragraph>
                  )
                }
              />
            </List.Item>
          )}
        />
      </section>

      <Modal
        title={
          selectedResult
            ? `Edit Project: ${selectedResult.name}`
            : "Project Details"
        }
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={720}
        destroyOnClose
        okText="Submit"
        cancelText="Cancel"
        okButtonProps={{
          disabled: fillLoading || !fillData,
          loading: submitting,
        }}
        styles={{ body: { maxHeight: "60vh", overflowY: "auto" } }}
      >
        {fillLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "48px 0",
            }}
          >
            <Spin tip="Loading project details..." />
          </div>
        ) : fillData ? (
          <Form form={form} layout="vertical" initialValues={fillData}>
            <Form.Item
              label="Project Name"
              name="name"
              initialValue={fillData.name ?? selectedResult?.name ?? ""}
            >
              <Input placeholder="Project name" />
            </Form.Item>
            <Form.Item label="Tagline" name="tagline">
              <Input placeholder="Short summary" />
            </Form.Item>
            <Form.Item label="Project Description" name="mainDescription">
              <Input.TextArea
                placeholder="Detailed project description"
                rows={4}
              />
            </Form.Item>
            <Form.Item name="logoUrl" hidden>
              <Input type="hidden" />
            </Form.Item>
            <Form.Item label="Logo" shouldUpdate>
              {() => {
                const logoUrl = form.getFieldValue("logoUrl");
                return logoUrl ? (
                  <div
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 12,
                      overflow: "hidden",
                      border: "1px solid #f0f0f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#fafafa",
                    }}
                  >
                    <Image
                      src={logoUrl}
                      alt="Project Logo"
                      width={120}
                      height={120}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      unoptimized
                    />
                  </div>
                ) : (
                  <Text type="secondary">No logo available</Text>
                );
              }}
            </Form.Item>
            <Form.Item label="Project Categories" name="categories">
              <Select
                mode="multiple"
                placeholder="Select project categories"
                options={CATEGORY_OPTIONS}
                allowClear
              />
            </Form.Item>
            <Form.Item label="Tags" name="tags">
              <Select
                mode="tags"
                placeholder="Add tags"
                tokenSeparators={[","]}
                allowClear
                options={
                  Array.isArray(fillData?.tags)
                    ? fillData.tags?.map((tag) => ({ label: tag, value: tag }))
                    : []
                }
              />
            </Form.Item>
            <Form.Item label="Application URL" name="appUrl">
              <Input placeholder="https://example.com" />
            </Form.Item>
            <Divider plain>Websites</Divider>
            <Form.List name="websites">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: "100%" }}>
                  {fields.map((field) => (
                    <Space
                      key={field.key}
                      align="baseline"
                      style={{ width: "100%" }}
                    >
                      <Form.Item
                        {...field}
                        name={[field.name, "title"]}
                        fieldKey={[field.fieldKey ?? field.key, "title"]}
                        style={{ flex: 1, marginBottom: 0 }}
                      >
                        <Input placeholder="Website title" />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, "url"]}
                        fieldKey={[field.fieldKey ?? field.key, "url"]}
                        style={{ flex: 2, marginBottom: 0 }}
                      >
                        <Input placeholder="https://example.com" />
                      </Form.Item>
                      <Button
                        type="link"
                        danger
                        onClick={() => remove(field.name)}
                      >
                        Remove
                      </Button>
                    </Space>
                  ))}
                  <Button
                    type="dashed"
                    onClick={() => add({ ...emptyWebsite })}
                    block
                  >
                    Add Website
                  </Button>
                </Space>
              )}
            </Form.List>
            <Form.Item
              label="Date Founded"
              name="dateFounded"
              getValueProps={(value) => ({
                value: mapDateStringToPickerValue(value),
              })}
              getValueFromEvent={(value) => mapPickerValueToDateString(value)}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              label="Launch Date"
              name="dateLaunch"
              getValueProps={(value) => ({
                value: mapDateStringToPickerValue(value),
              })}
              getValueFromEvent={(value) => mapPickerValueToDateString(value)}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Development Status" name="devStatus">
              <Select
                placeholder="Select development status"
                options={DEV_STATUS_OPTIONS}
                allowClear
              />
            </Form.Item>
            <Form.Item
              label="Open Source"
              name="openSource"
              getValueProps={(value) => ({
                value: mapBooleanToOptionValue(value),
              })}
              getValueFromEvent={(value) => mapOptionValueToBoolean(value)}
            >
              <Select
                placeholder="Select"
                options={BOOLEAN_OPTIONS}
                allowClear
              />
            </Form.Item>
            <Form.Item
              label="Code Repository"
              name="codeRepo"
              getValueProps={(value) => ({ value: value ?? "" })}
              getValueFromEvent={(event) => {
                const inputValue = event?.target?.value ?? "";
                const trimmed = inputValue.trim();
                return trimmed ? trimmed : null;
              }}
            >
              <Input placeholder="https://github.com/project" />
            </Form.Item>
            <Form.Item label="Organization Structure" name="orgStructure">
              <Select
                placeholder="Select organization structure"
                options={ORG_STRUCTURE_OPTIONS}
                allowClear
              />
            </Form.Item>
            <Form.Item
              label="Public Goods"
              name="publicGoods"
              getValueProps={(value) => ({
                value: mapBooleanToOptionValue(value),
              })}
              getValueFromEvent={(value) => mapOptionValueToBoolean(value)}
            >
              <Select placeholder="Select" options={BOOLEAN_OPTIONS} />
            </Form.Item>
            <Form.Item
              label="Funding Status"
              name="fundingStatus"
              getValueProps={(value) => ({
                value: mapBooleanToOptionValue(value),
              })}
              getValueFromEvent={(value) => mapOptionValueToBoolean(value)}
            >
              <Select placeholder="Select" options={BOOLEAN_OPTIONS} />
            </Form.Item>
            <Divider plain>Founding Team</Divider>
            <Form.List name="founders">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: "100%" }}>
                  {fields.map((field) => (
                    <Space
                      key={field.key}
                      align="baseline"
                      style={{ width: "100%" }}
                    >
                      <Form.Item
                        {...field}
                        name={[field.name, "name"]}
                        style={{ flex: 1, marginBottom: 0 }}
                      >
                        <Input placeholder="Name" />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, "title"]}
                        style={{ flex: 1, marginBottom: 0 }}
                      >
                        <Input placeholder="Title" />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, "region"]}
                        style={{ flex: 1, marginBottom: 0 }}
                      >
                        <Input placeholder="Region (optional)" />
                      </Form.Item>
                      <Button
                        type="link"
                        danger
                        onClick={() => remove(field.name)}
                      >
                        Remove
                      </Button>
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add(emptyFounder)} block>
                    Add Founder
                  </Button>
                </Space>
              )}
            </Form.List>
            <Form.Item label="Whitepaper URL" name="whitePaper">
              <Input placeholder="https://example.com/whitepaper" />
            </Form.Item>
          </Form>
        ) : (
          <Empty description="No data available" />
        )}
      </Modal>
    </main>
  );
}

function buildSubmissionPayload(
  values: ProjectFillFormValues,
  context: {
    fillData: ProjectFillResponse;
    selectedResult: RootDataSearchResult | null;
  }
): ProjectSubmitPayload {
  const { fillData, selectedResult } = context;

  const name = sanitizeString(
    values.name ?? fillData.name ?? selectedResult?.name
  );
  if (!name) {
    throw new Error("Project name is required before submission.");
  }

  const tagline = sanitizeString(values.tagline ?? fillData.tagline);
  if (!tagline) {
    throw new Error("Tagline is required before submission.");
  }

  const mainDescription = sanitizeString(
    values.mainDescription ?? fillData.mainDescription
  );
  if (!mainDescription) {
    throw new Error("Project description is required before submission.");
  }

  const categoriesSource = Array.isArray(values.categories)
    ? values.categories
    : Array.isArray(fillData.categories)
    ? fillData.categories
    : [];
  const categories = categoriesSource
    .map((item) => sanitizeString(item))
    .filter(Boolean);
  if (categories.length === 0) {
    throw new Error("Select at least one category before submission.");
  }

  const logoUrl = sanitizeString(
    values.logoUrl ?? fillData.logoUrl ?? selectedResult?.logo
  );
  if (!logoUrl) {
    throw new Error("Please provide a logo URL before submission.");
  }

  const websitesSource = Array.isArray(values.websites)
    ? values.websites
    : Array.isArray(fillData.websites)
    ? fillData.websites
    : [];
  const websites = websitesSource
    .map((site) => ({
      title: sanitizeString(site?.title),
      url: sanitizeString(site?.url),
    }))
    .filter((site) => site.title && site.url);
  if (websites.length === 0) {
    throw new Error("Provide at least one website link before submission.");
  }

  const appUrl = sanitizeNullableString(values.appUrl ?? fillData.appUrl);

  const dateFoundedRaw = values.dateFounded ?? fillData.dateFounded ?? null;
  const dateFounded = sanitizeString(dateFoundedRaw);
  if (!dateFounded || Number.isNaN(Date.parse(dateFounded))) {
    throw new Error("Founding date must be a valid ISO string.");
  }

  const dateLaunchRaw = values.dateLaunch ?? fillData.dateLaunch ?? null;
  let dateLaunch = sanitizeNullableString(dateLaunchRaw);
  if (dateLaunch && Number.isNaN(Date.parse(dateLaunch))) {
    dateLaunch = null;
  }

  const devStatus = sanitizeString(values.devStatus ?? fillData.devStatus);
  if (!devStatus) {
    throw new Error("Development status is required before submission.");
  }

  const fundingStatus = sanitizeNullableString(
    values.fundingStatus ?? fillData.fundingStatus
  );

  const openSource = resolveBoolean(values.openSource, fillData.openSource);
  if (typeof openSource !== "boolean") {
    throw new Error("Please indicate whether the project is open source.");
  }

  const publicGoods = resolveBoolean(values.publicGoods, fillData.publicGoods);
  if (typeof publicGoods !== "boolean") {
    throw new Error("Please indicate whether the project is a public good.");
  }

  const codeRepo = sanitizeNullableString(values.codeRepo ?? fillData.codeRepo);

  const orgStructure = sanitizeString(
    values.orgStructure ?? fillData.orgStructure
  );
  if (!orgStructure) {
    throw new Error("Organization structure is required before submission.");
  }

  const foundersSource = Array.isArray(values.founders)
    ? values.founders
    : Array.isArray(fillData.founders)
    ? fillData.founders
    : [];
  const founders = foundersSource
    .map((founder) => ({
      name: sanitizeString(founder?.name),
      title: sanitizeString(founder?.title),
    }))
    .filter((founder) => founder.name && founder.title)
    .map((founder) => {
      return { name: founder.name, title: founder.title };
    });
  if (founders.length === 0) {
    throw new Error("Please provide at least one founder with name and title.");
  }

  const tagsSource = Array.isArray(values.tags)
    ? values.tags
    : Array.isArray(fillData.tags)
    ? fillData.tags
    : [];
  const tags = tagsSource.map((tag) => sanitizeString(tag)).filter(Boolean);

  const whitePaper = sanitizeNullableString(
    values.whitePaper ?? fillData.whitePaper
  );

  return {
    name,
    tagline,
    categories,
    mainDescription,
    logoUrl,
    websites,
    appUrl,
    dateFounded,
    dateLaunch,
    devStatus,
    fundingStatus,
    openSource,
    codeRepo,
    orgStructure,
    publicGoods,
    founders,
    tags,
    whitePaper,
    tokenContract: null,
    dappSmartContracts: null,
    refs: null,
  };
}

function sanitizeString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  return trimmed;
}

function sanitizeNullableString(value: unknown): string | null {
  const sanitized = sanitizeString(value);
  return sanitized ? sanitized : null;
}

function resolveBoolean(
  value: unknown,
  fallback: unknown
): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof fallback === "boolean") {
    return fallback;
  }
  return undefined;
}

function normalizeFundingStatus(
  value: unknown,
  fallback: unknown
): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "boolean") {
    return value ? "Has Funding" : null;
  }
  if (typeof fallback === "string") {
    const trimmed = fallback.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof fallback === "boolean") {
    return fallback ? "Has Funding" : null;
  }
  return null;
}

function buildRefs(
  selectedResult: RootDataSearchResult | null,
  rootdataUrl?: string | null
): { key: string; value: string }[] | null {
  const refs: { key: string; value: string }[] = [];

  if (selectedResult?.id) {
    refs.push({ key: "rootdataProjectId", value: selectedResult.id });
  }

  if (rootdataUrl) {
    refs.push({ key: "rootdataUrl", value: rootdataUrl });
  }

  return refs.length > 0 ? refs : null;
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}
