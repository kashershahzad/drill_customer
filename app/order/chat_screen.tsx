import Add from "@/assets/svgs/plus.svg";
import Send from "@/assets/svgs/send.svg";
import Smile from "@/assets/svgs/smile.svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getInputFontSize,
  INPUT_ICON_SIZE,
  inputFieldStyles,
} from "~/components/inputfield";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { apiCall } from "~/utils/api";
import { ms, s, vs } from "~/utils/responsive";

// Define a simpler emoji picker array instead of using the library
const EMOJI_LIST = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "🤣",
  "😂",
  "🙂",
  "🙃",
  "😉",
  "😊",
  "😇",
  "🥰",
  "😍",
  "🤩",
  "😘",
  "😗",
  "😚",
  "😙",
  "😋",
  "😛",
  "😜",
  "🤪",
  "😝",
  "🤑",
  "🤗",
  "🤭",
  "🤫",
  "🤔",
  "🤐",
  "🤨",
  "😐",
  "😑",
  "😶",
  "😏",
  "😒",
  "🙄",
  "😬",
  "🤥",
  "😌",
  "😔",
  "😪",
  "🤤",
  "😴",
  "😷",
  "🤒",
  "🤕",
  "🤢",
  "🤮",
  "👍",
  "👎",
  "👌",
  "✌️",
  "🤞",
  "🤟",
  "🤘",
  "👏",
  "🙌",
  "👐",
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🖤",
  "❣️",
  "💕",
  "💞",
];

interface Message {
  id: string;
  text: string;
  sender: "user" | "provider" | "support_agent" | "system";
  timestamp: number;
  attachment?: string;
  msgType?: string;
  userId?: any;
  senderName?: string;
  senderImage?: string;
}

type ChatScreenProps = {
  supportRefreshSignal?: number;
};

const normalizeStoredId = (value?: string | number | null): string => {
  if (value == null) return "";
  let id = String(value).trim();
  if (!id) return "";
  if (id.startsWith('"')) {
    try {
      id = String(JSON.parse(id));
    } catch {
      id = id.replace(/^"|"$/g, "");
    }
  }
  return id.trim();
};

const isSupportAgentMessage = (
  fromId: string,
  support?: string | number,
  senderLabel = "",
) => {
  if (fromId === "0") return true;
  if (support === "1" || support === 1) return true;
  const label = senderLabel.trim();
  if (!label) return false;
  return /support/i.test(label) && !/service agent/i.test(label);
};

export default function ChatScreen({
  supportRefreshSignal = 0,
}: ChatScreenProps) {
  const { t } = useTranslation();
  const toIdRef = useRef<string>("");
  const customerUserIdRef = useRef<string>("");
  const providerUserIdRef = useRef<string>("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const [isMediaPickerVisible, setIsMediaPickerVisible] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [providerInfo, setProviderInfo] = useState<any>(null);
  const [supportRequired, setSupportRequired] = useState<boolean>(false);
  const [hasShownSupportMessage, setHasShownSupportMessage] =
    useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const isSendingRef = useRef<boolean>(false);
  const keyboardVisibleRef = useRef(false);
  const scrollPendingRef = useRef(false);
  const IMAGE_BASE_URL = "https://7tracking.com/saudiservices/images/";

  const scheduleScrollToEnd = useCallback((animated = true) => {
    if (keyboardVisibleRef.current) {
      scrollPendingRef.current = true;
      return;
    }

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => {
      keyboardVisibleRef.current = true;
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardVisibleRef.current = false;
      if (scrollPendingRef.current) {
        scrollPendingRef.current = false;
        scheduleScrollToEnd(true);
      }
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scheduleScrollToEnd]);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const storedOrderId = normalizeStoredId(
          await AsyncStorage.getItem("order_id"),
        );
        const userId = normalizeStoredId(await AsyncStorage.getItem("user_id"));
        setOrderId(storedOrderId);
        setUserId(userId);
        customerUserIdRef.current = userId;

        if (storedOrderId && userId) {
          const orderMeta = await fetchOrderDetails(storedOrderId);
          fetchChatHistory(
            storedOrderId,
            userId,
            true,
            undefined,
            orderMeta?.toId,
            orderMeta?.provider,
          );

          // Set up interval to fetch new messages every few seconds
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }

          intervalRef.current = setInterval(() => {
            if (storedOrderId && userId) {
              void (async () => {
                const meta = await fetchOrderDetails(storedOrderId);
                fetchChatHistory(
                  storedOrderId,
                  userId,
                  false,
                  undefined,
                  meta?.toId,
                  meta?.provider,
                );
              })();
            }
          }, 10000);
        }
      };
      init();

      // Clean up the interval when the component loses focus
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, []),
  );

  const fetchOrderDetails = async (orderIdParam: string) => {
    try {
      const normalizedOrderId =
        normalizeStoredId(orderIdParam) || orderIdParam;
      const formData = new FormData();
      formData.append("type", "get_data");
      formData.append("table_name", "orders");
      formData.append("id", normalizedOrderId);

      const response = await apiCall(formData);
      console.log("order details", response);
      if (response && response.data && response.data.length > 0) {
        const orderData = response.data[0];
        const resolvedToId = normalizeStoredId(orderData.to_id ?? "0");
        const resolvedCustomerId = normalizeStoredId(orderData.user_id);
        const resolvedProviderId = normalizeStoredId(
          orderData.provider?.id ?? orderData.to_id,
        );

        toIdRef.current = resolvedToId;
        if (resolvedCustomerId) {
          customerUserIdRef.current = resolvedCustomerId;
        }
        if (resolvedProviderId && resolvedProviderId !== "0") {
          providerUserIdRef.current = resolvedProviderId;
        }

        if (orderData.provider) {
          setProviderInfo(orderData.provider);
        }

        const isSupportRequired =
          orderData.support_required === "1" ||
          orderData.support_required === 1;

        // If support was just requested (changed from false to true), show the message
        if (isSupportRequired && !supportRequired) {
          setHasShownSupportMessage(true);
        }

        setSupportRequired(isSupportRequired);

        return {
          toId: resolvedToId,
          provider: orderData.provider ?? null,
          customerUserId: resolvedCustomerId,
          providerUserId: resolvedProviderId,
        };
      }
    } catch (error) {
      console.error("Failed to fetch order details", error);
    }

    return null;
  };

  const resolveMessageSender = (
    msg: {
      from_id?: string | number;
      support?: string | number;
      sender?: string | null;
    },
    customerUserId: string,
    provider?: { id?: string | number; name?: string; image?: string | null } | null,
    providerUserId = "",
  ): {
    sender: "user" | "provider" | "support_agent";
    senderName: string;
    senderImage: string | null;
  } => {
    const fromId = normalizeStoredId(msg.from_id);
    const customerId = normalizeStoredId(customerUserId);
    const providerId = normalizeStoredId(
      providerUserId || provider?.id || providerUserIdRef.current,
    );
    const senderLabel = String(msg.sender ?? "").trim();
    const senderName = senderLabel || t("order.nameNotAvailable");

    if (customerId && fromId === customerId) {
      return {
        sender: "user",
        senderName,
        senderImage: null,
      };
    }

    if (isSupportAgentMessage(fromId, msg.support, senderLabel)) {
      return {
        sender: "support_agent",
        senderName,
        senderImage: null,
      };
    }

    return {
      sender: "provider",
      senderName,
      senderImage: provider?.image || null,
    };
  };

  const fetchChatHistory = async (
    orderIdParam: string,
    userIdParam: string,
    showLoading = true,
    showSupportMessage?: boolean,
    chatToId?: string,
    chatProvider?: { name?: string; image?: string | null } | null,
  ) => {
    if (showLoading) {
      setIsLoading(true);
    }

    const resolvedProvider = chatProvider ?? providerInfo;
    const customerUserId =
      customerUserIdRef.current || normalizeStoredId(userIdParam);

    const formData = new FormData();
    formData.append("type", "checkmsg");
    formData.append("user_id", customerUserId);
    formData.append("order_id", normalizeStoredId(orderIdParam));
    formData.append("to_id", normalizeStoredId(chatToId));

    try {
      const response = await apiCall(formData);
      console.log("chat history", response);

      if (response && Array.isArray(response.chat)) {
        if (response.user) {
          setUserInfo(response.user);
        }
        if (response.provider) {
          setProviderInfo(response.provider);
        }

        const formattedMessages = response.chat
          .map((msg: any) => {
            const { sender, senderName, senderImage } = resolveMessageSender(
              msg,
              customerUserId,
              response.provider ?? resolvedProvider,
              providerUserIdRef.current,
            );

            return {
              id: String(msg.id),
              text: msg.msg,
              sender,
              timestamp: Number(msg.datetime) || Date.now(),
              msgType: msg.msg_type === "file" ? "file" : "msg",
              senderName,
              senderImage,
            };
          })
          .sort((a: Message, b: Message) => a.timestamp - b.timestamp);

        // Oldest at top, newest at bottom (API already sends chronological order)
        let finalMessages = formattedMessages;
        const shouldShowSupportMessage =
          showSupportMessage ?? (supportRequired && hasShownSupportMessage);
        if (shouldShowSupportMessage) {
          const supportMessageExists = finalMessages.some(
            (msg: Message) =>
              msg.sender === "system" &&
              msg.text.includes("Support Agent Added"),
          );

          if (!supportMessageExists) {
            // Find the position to insert the system message (after user messages requesting support)
            const insertIndex = finalMessages.findIndex(
              (msg: Message) => msg.sender === "user" && msg.timestamp > 0,
            );

            const systemMessage = {
              id: `support-added-${Date.now()}`,
              text: "Support Agent Added",
              sender: "system" as const,
              timestamp: Date.now(),
              msgType: "msg" as const,
              senderName: "",
              senderImage: null,
            };

            if (insertIndex >= 0) {
              finalMessages.splice(insertIndex + 1, 0, systemMessage);
            } else {
              finalMessages = [systemMessage, ...finalMessages];
            }
          }
        }

        setMessages(finalMessages);
      } else {
        // Handle case where chat is undefined
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to fetch chat history", error);
      setMessages([]);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  const uploadImageToServer = async (imageUri: string) => {
    try {
      if (!userId) throw new Error("User ID not found");

      const uriParts = imageUri.split(".");
      const fileType = uriParts[uriParts.length - 1];

      const formData = new FormData();
      formData.append("type", "upload_data");
      formData.append("user_id", userId);
      formData.append("file", {
        uri: imageUri,
        name: `profile.${fileType}`,
        type: `image/${fileType}`,
      } as any);

      const response = await apiCall(formData);
      if (response.result && response.file_name) {
        setUploadedFileName(response.file_name);
        return response.file_name;
      } else {
        throw new Error(response.message || t("order.errorWithUpload"));
      }
    } catch (err: any) {
      Alert.alert(t("error"), err.message || t("order.errorWithUpload"));
      return null;
    }
  };

  const sendMessage = async () => {
    // Prevent multiple simultaneous sends
    if (isSendingRef.current) {
      return;
    }

    if (!orderId || !userId || (inputMessage.trim() === "" && !attachment))
      return;

    try {
      isSendingRef.current = true;
      setIsLoading(true);

      // If there's an attachment but no uploaded filename yet, upload it first
      let filename = uploadedFileName;
      if (attachment && !uploadedFileName) {
        filename = await uploadImageToServer(attachment);
        if (!filename) {
          isSendingRef.current = false;
          setIsLoading(false);
          return; // Exit if upload failed
        }
      }

      const formData = new FormData();
      formData.append("type", "sendmsg");
      formData.append("user_id", userId);
      formData.append("to_id", toIdRef.current || "0");
      formData.append("order_id", normalizeStoredId(orderId));

      // Determine message type and content based on attachment
      const msgType = attachment ? "file" : "msg";
      formData.append("msg_type", msgType);

      // If it's a file, send the filename, otherwise send the input message
      if (attachment && filename) {
        formData.append("msg", filename);
      } else {
        formData.append("msg", inputMessage);
      }

      const response = await apiCall(formData);
      if (response && response.result) {
        // Clear form after successful send
        setInputMessage("");
        setAttachment(null);
        setUploadedFileName(null);

        // Refresh chat history
        if (orderId && userId) {
          await fetchChatHistory(orderId, userId);
        }
      }
    } catch (error) {
      console.error("Failed to send message", error);
      Alert.alert(t("error"), t("order.failedToSend"));
    } finally {
      setIsLoading(false);
      isSendingRef.current = false;
    }
  };

  const confirmDeleteMessage = (messageId: string) => {
    if (!userId) return;

    Alert.alert(t("order.deleteMessage"), t("order.deleteConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("order.deleteMessage"),
        style: "destructive",
        onPress: () => deleteMessage(messageId, userId),
      },
    ]);
  };

  const deleteMessage = async (messageId: string, userIdParam: string) => {
    try {
      const formData = new FormData();
      formData.append("type", "delete_chat");
      formData.append("user_id", userIdParam);
      formData.append("id", messageId);

      const response = await apiCall(formData);
      if (response && response.result) {
        setMessages(messages.filter((msg) => msg.id !== messageId));
      }
    } catch (error) {
      console.error("Failed to delete message", error);
    }
  };

  const pickImage = async (source: "camera" | "gallery" | "document") => {
    let result;

    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("order.permissionNeeded"), t("order.cameraPermission"));
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
    } else {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("order.permissionNeeded"), t("order.galleryPermission"));
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
    }

    if (!result.canceled) {
      const selectedUri = result.assets[0].uri;
      setAttachment(selectedUri);
      setIsMediaPickerVisible(false);

      // Upload image right after selection
      setIsLoading(true);
      try {
        const filename = await uploadImageToServer(selectedUri);
        if (filename) {
          setUploadedFileName(filename);
        }
      } catch (error) {
        console.error("Failed to upload image", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!supportRefreshSignal || !orderId || !userId) return;

    let cancelled = false;

    const refreshAfterSupport = async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (cancelled) return;

      setHasShownSupportMessage(true);
      setSupportRequired(true);
      const meta = await fetchOrderDetails(orderId);
      await fetchChatHistory(
        orderId,
        userId,
        false,
        true,
        meta?.toId,
        meta?.provider,
      );
    };

    refreshAfterSupport();

    return () => {
      cancelled = true;
    };
  }, [supportRefreshSignal, orderId, userId]);

  const openMediaPicker = () => {
    Keyboard.dismiss();
    setIsMediaPickerVisible(true);
  };

  const onEmojiSelected = (emoji: string) => {
    setInputMessage((prevInput) => prevInput + emoji);
    setIsEmojiPickerVisible(false);
  };

  useEffect(() => {
    scheduleScrollToEnd(true);
  }, [messages, scheduleScrollToEnd]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <View style={styles.chatContainer}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          ref={scrollViewRef}
          onContentSizeChange={() => scheduleScrollToEnd(true)}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages && messages.length > 0
            ? messages.map((message, index) => {
                // Handle system messages (Support Agent Added)
                if (message.sender === "system") {
                  return (
                    <View
                      key={message.id}
                      style={styles.systemMessageContainer}
                    >
                      <View style={styles.systemMessageLine} />
                      <Text style={styles.systemMessageText}>
                        {message.text}
                      </Text>
                      <View style={styles.systemMessageLine} />
                    </View>
                  );
                }

                const showProfile =
                  message.sender !== "user" &&
                  (index === 0 ||
                    messages[index - 1].sender !== message.sender ||
                    messages[index - 1].senderName !== message.senderName);

                return (
                  <View
                    key={message.id}
                    style={
                      message.sender === "user"
                        ? styles.userMessageContainer
                        : message.sender === "support_agent"
                          ? styles.supportAgentMessageContainer
                          : styles.providerMessageContainer
                    }
                  >
                    {showProfile ? (
                      <View
                        style={
                          message.sender === "user"
                            ? styles.userSenderInfoContainer
                            : styles.providerInfoContainer
                        }
                      >
                        <Text style={styles.senderName}>
                          {message.senderName}
                        </Text>
                      </View>
                    ) : null}
                    <TouchableOpacity
                      onLongPress={() => confirmDeleteMessage(message.id)}
                      style={
                        message.sender === "user"
                          ? styles.userMessage
                          : message.sender === "support_agent"
                            ? styles.supportAgentMessage
                            : styles.providerMessage
                      }
                    >
                      {message.msgType === "file" && (
                        <Image
                          source={{
                            uri: message.text.startsWith("http")
                              ? message.text
                              : `${IMAGE_BASE_URL}${message.text}`,
                          }}
                          style={styles.messageImage}
                          resizeMode="cover"
                        />
                      )}

                      {message.msgType === "msg" && (
                        <Text style={styles.messageText}>{message.text}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            : !isLoading && (
                <View style={styles.noMessagesContainer}>
                  <Text style={styles.noMessagesText}>
                    {t("order.noMessagesYet")}
                  </Text>
                </View>
              )}
        </ScrollView>

        {/* Chat input stays visible */}
        <View>
          <View style={styles.chatInputContainer}>
            <TouchableOpacity onPress={openMediaPicker}>
              <Add width={INPUT_ICON_SIZE} height={INPUT_ICON_SIZE} />
            </TouchableOpacity>
            <View style={styles.inputFieldContainer}>
              <TextInput
                style={[
                  styles.chatInput,
                  { fontSize: getInputFontSize(inputMessage) },
                ]}
                value={inputMessage}
                onChangeText={(text) => setInputMessage(text)}
                placeholder={
                  attachment ? t("order.sendWithImage") : t("order.typeMessage")
                }
                placeholderTextColor={Colors.secondary300}
                multiline
              />
              {attachment && (
                <View style={styles.inlineAttachmentContainer}>
                  <Image
                    source={{ uri: attachment }}
                    style={styles.inlineAttachment}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeInlineAttachment}
                    onPress={() => {
                      setAttachment(null);
                      setUploadedFileName(null);
                    }}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setIsEmojiPickerVisible(true);
                }}
              >
                <Smile width={INPUT_ICON_SIZE} height={INPUT_ICON_SIZE} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={sendMessage}
              disabled={
                (inputMessage.trim() === "" && !attachment) ||
                isLoading ||
                isSendingRef.current
              }
              style={[
                styles.sendButton,
                (inputMessage.trim() === "" && !attachment) ||
                isLoading ||
                isSendingRef.current
                  ? styles.disabledSendButton
                  : {},
              ]}
            >
              <Send />
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Emoji Picker Modal */}
        <Modal
          visible={isEmojiPickerVisible}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.emojiPickerHeader}>
              <Text style={styles.emojiPickerTitle}>
                {t("order.selectEmoji")}
              </Text>
              <TouchableOpacity onPress={() => setIsEmojiPickerVisible(false)}>
                <Text style={styles.closeButton}>{t("order.close")}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.emojiScrollView}>
              <View style={styles.emojiGrid}>
                {EMOJI_LIST.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.emojiButton}
                    onPress={() => onEmojiSelected(emoji)}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Media Picker Modal */}
        <Modal
          visible={isMediaPickerVisible}
          transparent={true}
          animationType="slide"
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setIsMediaPickerVisible(false)}
            activeOpacity={1}
          >
            <View style={styles.mediaPickerContainer}>
              <TouchableOpacity
                style={styles.mediaOption}
                onPress={() => pickImage("camera")}
              >
                <Text style={styles.mediaOptionText}>
                  {t("order.takePhoto")}
                </Text>
              </TouchableOpacity>
              <View style={styles.mediaDivider} />
              <TouchableOpacity
                style={styles.mediaOption}
                onPress={() => pickImage("gallery")}
              >
                <Text style={styles.mediaOptionText}>
                  {t("order.chooseFromGallery")}
                </Text>
              </TouchableOpacity>
              <View style={styles.mediaDivider} />
              <TouchableOpacity
                style={[styles.mediaOption, styles.cancelButton]}
                onPress={() => setIsMediaPickerVisible(false)}
              >
                <Text style={styles.cancelText}>{t("cancel")}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatContainer: { flex: 1, backgroundColor: Colors.white },
  scrollViewContent: {
    paddingHorizontal: s(14),
    paddingTop: vs(14),
    flexGrow: 1,
    paddingBottom: vs(10),
  },
  userMessageContainer: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
    marginBottom: vs(10),
    maxWidth: "80%",
  },
  providerMessageContainer: {
    flexDirection: "column",
    alignSelf: "flex-start",
    alignItems: "flex-start",
    marginBottom: vs(10),
    maxWidth: "80%",
  },
  supportAgentMessageContainer: {
    flexDirection: "column",
    alignSelf: "flex-start",
    alignItems: "flex-start",
    marginBottom: vs(10),
    maxWidth: "80%",
  },
  systemMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: vs(14),
    width: "100%",
  },
  systemMessageLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray,
    marginHorizontal: s(7),
  },
  systemMessageText: {
    fontSize: ms(12),
    fontFamily: FONTS.medium,
    color: Colors.secondary300,
  },
  providerInfoContainer: {
    marginBottom: vs(4),
    width: "100%",
  },
  userSenderInfoContainer: {
    marginBottom: vs(4),
    width: "100%",
    alignItems: "flex-end",
  },
  supportAgentMessage: {
    backgroundColor: Colors.gray100,
    padding: s(11),
    borderRadius: ms(14),
    borderBottomStartRadius: 4,
    maxWidth: "100%",
  },
  senderName: {
    fontSize: ms(12),
    fontFamily: FONTS.medium,
    color: Colors.secondary,
  },
  userMessage: {
    backgroundColor: Colors.success100,
    padding: s(11),
    borderRadius: ms(14),
    borderBottomEndRadius: 4,
    maxWidth: "100%",
  },
  providerMessage: {
    backgroundColor: Colors.gray100,
    padding: s(11),
    borderRadius: ms(14),
    borderBottomStartRadius: 4,
    maxWidth: "100%",
  },
  messageText: {
    color: Colors.secondary,
    fontSize: ms(15),
    fontFamily: FONTS.regular,
  },
  messageImage: {
    width: s(180),
    height: s(180),
    borderRadius: ms(8),
    marginBottom: vs(7),
  },
  chatInputContainer: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    paddingVertical: vs(7),
    justifyContent: "space-between",
  },
  inputFieldContainer: {
    ...inputFieldStyles.fieldContainer,
    flex: 1,
    marginHorizontal: s(7),
  },
  chatInput: {
    ...inputFieldStyles.fieldInput,
    maxHeight: vs(90),
  },
  sendButton: { backgroundColor: Colors.white },
  disabledSendButton: { opacity: 0.5 },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    marginTop: "50%",
    borderTopLeftRadius: ms(20),
    borderTopRightRadius: ms(20),
    overflow: "hidden",
  },
  emojiPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: s(14),
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  emojiPickerTitle: {
    fontSize: ms(17),
    fontFamily: FONTS.semiBold,
    color: Colors.secondary,
  },
  closeButton: {
    color: Colors.primary,
    fontSize: ms(15),
    fontFamily: FONTS.semiBold,
  },
  emojiScrollView: { flex: 1 },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: s(9),
  },
  emojiButton: {
    width: "20%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: s(9),
  },
  emojiText: { fontSize: ms(22), fontFamily: FONTS.regular },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  mediaPickerContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: ms(20),
    borderTopRightRadius: ms(20),
    padding: s(8),
  },
  mediaOption: { paddingVertical: vs(14), alignItems: "center" },
  mediaOptionText: {
    fontSize: ms(17),
    fontFamily: FONTS.regular,
    color: Colors.primary,
  },
  mediaDivider: { height: 1, backgroundColor: Colors.gray100 },
  cancelButton: { marginTop: vs(7) },
  cancelText: { fontSize: ms(17), color: "red", fontFamily: FONTS.semiBold },
  inlineAttachmentContainer: { position: "relative", marginRight: s(7) },
  inlineAttachment: { width: s(38), height: s(38), borderRadius: ms(4) },
  removeInlineAttachment: {
    position: "absolute",
    top: -vs(7),
    right: -s(7),
    backgroundColor: Colors.secondary,
    width: s(17),
    height: s(17),
    borderRadius: ms(9),
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    color: Colors.white,
    fontSize: ms(12),
    fontFamily: FONTS.bold,
  },
  noMessagesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: s(36),
  },
  noMessagesText: {
    color: Colors.gray,
    fontSize: ms(15),
    fontFamily: FONTS.regular,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
});
