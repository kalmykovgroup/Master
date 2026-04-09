import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  useOrderDetail,
  useCompleteOrderMaster,
  useCompleteOrderClient,
} from '../hooks/useOrders';
import {useOrderViews} from '../hooks/useOrderViews';
import {useCreateReview} from '../../reviews/hooks/useReviews';
import {StarRating} from '../../reviews/components/StarRating';
import {
  useOrderResponses,
  useCreateResponse,
  useUpdateResponseStatus,
} from '../hooks/useResponses';
import {
  useSpecialOffer,
  useCreateSpecialOffer,
  useUpdateSpecialOfferStatus,
} from '../hooks/useSpecialOffers';
import {useGetOrCreateConversation} from '../../chat/hooks/useConversations';
import {useAuthStore} from '../../../stores/authStore';
import {useUiStore} from '../../../stores/uiStore';
import {ResponseListItem} from '../components/ResponseListItem';
import {Button} from '../../../shared/components/Button';
import {Input} from '../../../shared/components/Input';
import {LoadingScreen} from '../../../shared/components/LoadingScreen';
import {EmptyState} from '../../../shared/components/EmptyState';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import {supabase} from '../../../config/supabase';
import {formatBudgetRange} from '../../../shared/utils/formatCurrency';
import {formatRelative} from '../../../shared/utils/formatDate';
import {colors} from '../../../config/colors';
import type {
  ClientOrdersStackParamList,
  UnifiedTabParamList,
} from '../../../types/navigation';
import type {SpecialOffer} from '../../../types/database';

type OrderDetailRoute = RouteProp<{OrderDetail: {orderId: string}}, 'OrderDetail'>;

export function OrderDetailScreen() {
  const {t, i18n} = useTranslation();
  const insets = useSafeAreaInsets();
  const route = useRoute<OrderDetailRoute>();
  const navigation =
    useNavigation<NativeStackNavigationProp<ClientOrdersStackParamList>>();
  const {orderId} = route.params;
  const role = useAuthStore(s => s.role);
  const userId = useAuthStore(s => s.session?.user.id);
  const {data: order, loading: orderLoading} = useOrderDetail(orderId);
  const {data: responses, refetch: refetchResponses} =
    useOrderResponses(orderId);
  const {createResponse} = useCreateResponse();
  const {updateStatus} = useUpdateResponseStatus();
  const {getOrCreate} = useGetOrCreateConversation();
  const {updateStatus: updateOfferStatus} = useUpdateSpecialOfferStatus();
  const {completeMaster} = useCompleteOrderMaster();
  const {completeClient} = useCompleteOrderClient();
  const {createReview} = useCreateReview();
  const {recordView} = useOrderViews();
  const addToast = useUiStore(s => s.addToast);

  useEffect(() => {
    recordView(orderId);
  }, [orderId, recordView]);

  const [message, setMessage] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isOwner = order?.client_id === userId;
  const isAssignedMaster = order?.assigned_master_id === userId;
  const myResponse = Array.isArray(responses)
    ? responses.find((r: any) => r.master_id === userId)
    : null;
  const alreadyResponded = !!myResponse;
  const responsesCount = Array.isArray(responses) ? responses.length : 0;

  // Special offer state for master
  const {data: specialOffer, refetch: refetchOffer} = useSpecialOffer(
    myResponse?.id ?? '',
  );
  const {createOffer} = useCreateSpecialOffer();
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerMessage, setOfferMessage] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [completingMaster, setCompletingMaster] = useState(false);
  const [completingClient, setCompletingClient] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);

  // Special offers for owner view
  const [specialOffers, setSpecialOffers] = useState<
    Record<string, SpecialOffer>
  >({});

  const loadSpecialOffers = useCallback(async () => {
    if (!responses || !Array.isArray(responses)) return;
    const responseIds = responses.map((r: any) => r.id);
    if (responseIds.length === 0) return;
    const {data} = await supabase
      .from('special_offers')
      .select('*')
      .in('response_id', responseIds);
    if (data) {
      const map: Record<string, SpecialOffer> = {};
      data.forEach((offer: SpecialOffer) => {
        map[offer.response_id] = offer;
      });
      setSpecialOffers(map);
    }
  }, [responses]);

  useEffect(() => {
    if (isOwner) {
      loadSpecialOffers();
    }
  }, [isOwner, loadSpecialOffers]);

  const loadSpecialOffersRef = useRef(loadSpecialOffers);
  loadSpecialOffersRef.current = loadSpecialOffers;

  useEffect(() => {
    if (!isOwner) return;
    const channel = supabase
      .channel(`special-offers-detail-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'special_offers',
        },
        () => {
          loadSpecialOffersRef.current();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, isOwner]);

  const handleRespond = async () => {
    setSubmitting(true);
    const proposedPrice = price ? parseInt(price, 10) * 100 : undefined;
    await createResponse(orderId, message, proposedPrice);
    setMessage('');
    setPrice('');
    setSubmitting(false);
    refetchResponses();
  };

  const handleSendOffer = async () => {
    if (!myResponse || !order) return;
    setOfferSubmitting(true);
    const proposedPrice = offerPrice
      ? parseInt(offerPrice, 10) * 100
      : undefined;
    await createOffer({
      responseId: myResponse.id,
      clientId: order.client_id,
      message: offerMessage,
      proposedPrice,
    });
    setOfferSubmitting(false);
    setShowOfferModal(false);
    setOfferMessage('');
    setOfferPrice('');
    refetchOffer();
  };

  const handleChat = async (masterId: string, responseMessage?: string | null) => {
    const {data: conv, isNew} = await getOrCreate(orderId, masterId);
    if (conv) {
      if (isNew && responseMessage) {
        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: masterId,
          text: responseMessage,
        });
      }
      const tabNav =
        navigation.getParent<NativeStackNavigationProp<UnifiedTabParamList>>();
      tabNav?.navigate('ChatsTab', {
        screen: 'Chat',
        params: {conversationId: conv.id, title: order?.title},
      });
    }
  };

  const handleAccept = async (responseId: string) => {
    await updateStatus(responseId, 'accepted');
    refetchResponses();
  };

  const handleReject = async (responseId: string) => {
    await updateStatus(responseId, 'rejected');
    refetchResponses();
  };

  const handleAcceptOffer = async (offerId: string) => {
    await updateOfferStatus(offerId, 'accepted');
    loadSpecialOffers();
  };

  const handleRejectOffer = async (offerId: string) => {
    await updateOfferStatus(offerId, 'rejected');
    loadSpecialOffers();
  };

  const handleCompleteMaster = async () => {
    setCompletingMaster(true);
    await completeMaster(orderId);
    setCompletingMaster(false);
  };

  const handleCompleteClient = async () => {
    setCompletingClient(true);
    await completeClient(orderId);
    setCompletingClient(false);
  };

  const handleSubmitReview = async () => {
    if (!order?.assigned_master_id || reviewRating === 0) return;
    setReviewSubmitting(true);
    const {error: err} = await createReview(
      orderId,
      order.assigned_master_id,
      reviewRating,
      reviewComment,
    );
    setReviewSubmitting(false);
    if (!err) {
      setReviewSent(true);
      addToast(t('reviews.sent'), 'success');
    }
  };

  if (orderLoading && !order) {
    return <LoadingScreen />;
  }

  if (!order) {
    return <EmptyState message={t('common.error')} />;
  }

  const budgetText = formatBudgetRange(order.budget_min, order.budget_max);

  const renderHeader = () => (
    <View>
      {/* Order details - all fields */}
      <View style={styles.orderInfo}>
        {/* Title */}
        <Text style={styles.orderTitle}>{order.title}</Text>

        {/* Status + date */}
        <View style={styles.metaRow}>
          <Text style={styles.categoryText}>
            {t(`categories.${order.category}` as const)}
          </Text>
          <Text style={styles.dateText}>
            {formatRelative(order.created_at, i18n.language)}
          </Text>
        </View>

        {/* Description */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>{t('orders.description')}</Text>
          <Text style={styles.fieldValue}>
            {order.description || t('orders.notSpecified')}
          </Text>
        </View>

        {/* Budget */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>{t('orders.budget')}</Text>
          <Text style={[styles.fieldValue, budgetText ? styles.priceText : styles.emptyText]}>
            {budgetText || t('orders.notSpecified')}
          </Text>
        </View>

        {/* Location */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>{t('orders.location')}</Text>
          <Text style={[styles.fieldValue, !order.location && styles.emptyText]}>
            {order.location || t('orders.notSpecified')}
          </Text>
        </View>
      </View>

      {/* Edit button for owner */}
      {isOwner && order.status === 'open' && (
        <Button
          title={t('orders.edit')}
          onPress={() => navigation.navigate('EditOrder', {orderId})}
          variant="outline"
          style={styles.editBtn}
        />
      )}

      {/* Responses header for owner */}
      {isOwner && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {t('orders.responsesCount', {count: responsesCount})}
          </Text>
        </View>
      )}

      {/* === Master view (can also respond to own orders) === */}
      {role === 'master' && (
        <>
          {/* Respond form */}
          {order.status === 'open' && !alreadyResponded && (
            <View style={styles.respondSection}>
              <Text style={styles.sectionTitle}>{t('orders.respond')}</Text>
              <Input
                placeholder={t('orders.message')}
                value={message}
                onChangeText={setMessage}
                multiline
              />
              <Input
                placeholder={t('orders.proposedPrice')}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
              <Button
                title={t('orders.respond')}
                onPress={handleRespond}
                loading={submitting}
                disabled={!message.trim()}
                testID="respond-btn"
              />
            </View>
          )}

          {/* Response status card */}
          {myResponse && (
            <View style={styles.myResponseCard}>
              <View style={styles.myResponseHeader}>
                <Text style={styles.myResponseLabel}>{t('orders.youResponded')}</Text>
                <View
                  style={[
                    styles.statusPill,
                    myResponse.status === 'accepted'
                      ? styles.pillAccepted
                      : myResponse.status === 'rejected'
                        ? styles.pillRejected
                        : styles.pillPending,
                  ]}>
                  <Text
                    style={[
                      styles.statusPillText,
                      myResponse.status === 'accepted'
                        ? {color: colors.statusAcceptedText}
                        : myResponse.status === 'rejected'
                          ? {color: colors.statusRejectedText}
                          : {color: colors.statusPendingText},
                    ]}>
                    {myResponse.status === 'accepted'
                      ? t('orders.accepted')
                      : myResponse.status === 'rejected'
                        ? t('orders.rejected')
                        : t('orders.offerPending')}
                  </Text>
                </View>
              </View>
              {myResponse.message && (
                <Text style={styles.myResponseMessage}>{myResponse.message}</Text>
              )}

              {/* Rejected: special offer */}
              {myResponse.status === 'rejected' && (
                <View style={styles.specialOfferArea}>
                  {!specialOffer ? (
                    <Button
                      title={t('orders.sendOffer')}
                      onPress={() => setShowOfferModal(true)}
                    />
                  ) : (
                    <View style={styles.offerSentCard}>
                      <Text style={styles.offerSentLabel}>{t('orders.specialOffer')}</Text>
                      <Text style={styles.offerSentMessage}>{specialOffer.message}</Text>
                      <View
                        style={[
                          styles.statusPill,
                          specialOffer.status === 'accepted'
                            ? styles.pillAccepted
                            : specialOffer.status === 'rejected'
                              ? styles.pillRejected
                              : styles.pillPending,
                        ]}>
                        <Text
                          style={[
                            styles.statusPillText,
                            specialOffer.status === 'accepted'
                              ? {color: colors.statusAcceptedText}
                              : specialOffer.status === 'rejected'
                                ? {color: colors.statusRejectedText}
                                : {color: colors.statusPendingText},
                          ]}>
                          {specialOffer.status === 'pending'
                            ? t('orders.offerPending')
                            : specialOffer.status === 'accepted'
                              ? t('orders.offerAccepted')
                              : t('orders.offerRejected')}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Master completion: mark as completed */}
          {isAssignedMaster &&
            order.status === 'in_progress' &&
            !order.master_completed && (
              <Button
                title={t('orders.markCompleted')}
                onPress={handleCompleteMaster}
                loading={completingMaster}
                style={styles.completionBtn}
              />
            )}

          {/* Master completion: awaiting client */}
          {isAssignedMaster &&
            order.status === 'in_progress' &&
            order.master_completed && (
              <View style={styles.completionInfo}>
                <Text style={styles.completionInfoText}>
                  {t('orders.awaitingClient')}
                </Text>
              </View>
            )}
        </>
      )}

      {/* === Client completion === */}
      {isOwner && order.status === 'in_progress' && order.master_completed && (
        <View style={styles.completionSection}>
          <Text style={styles.completionInfoText}>
            {t('orders.masterCompleted')}
          </Text>
          <Button
            title={t('orders.confirmCompleted')}
            onPress={handleCompleteClient}
            loading={completingClient}
            style={styles.completionBtn}
          />
        </View>
      )}

      {/* === Client review after completion === */}
      {isOwner &&
        order.status === 'completed' &&
        order.master_completed &&
        order.assigned_master_id && (
          <View style={styles.reviewSection}>
            {!reviewSent ? (
              <>
                <Text style={styles.sectionTitle}>
                  {t('orders.leaveReview')}
                </Text>
                <StarRating
                  rating={reviewRating}
                  size={28}
                  onChange={setReviewRating}
                />
                <Input
                  placeholder={t('reviews.commentPlaceholder')}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                  numberOfLines={3}
                  containerStyle={styles.reviewInput}
                />
                <Button
                  title={t('reviews.submit')}
                  onPress={handleSubmitReview}
                  loading={reviewSubmitting}
                  disabled={reviewRating === 0}
                />
              </>
            ) : (
              <Text style={styles.reviewSentText}>
                {t('reviews.sent')}
              </Text>
            )}
          </View>
        )}
    </View>
  );

  return (
    <ScreenWrapper>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>{'\u2190'}</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t('orders.detail')}
          </Text>
        </View>

        {role === 'client' && isOwner ? (
          <FlatList
            data={responses as any[] | null}
            keyExtractor={item => item.id}
            ListHeaderComponent={renderHeader}
            renderItem={({item}) => (
              <ResponseListItem
                response={item}
                specialOffer={specialOffers[item.id]}
                onPress={() =>
                  navigation.navigate('SpecialistProfile', {
                    userId: item.master_id,
                  })
                }
                onChat={() => handleChat(item.master_id, item.message)}
                onAccept={() => handleAccept(item.id)}
                onReject={() => handleReject(item.id)}
                onAcceptOffer={() => {
                  const offer = specialOffers[item.id];
                  if (offer) handleAcceptOffer(offer.id);
                }}
                onRejectOffer={() => {
                  const offer = specialOffers[item.id];
                  if (offer) handleRejectOffer(offer.id);
                }}
              />
            )}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.emptyResponseText}>{t('orders.noResponses')}</Text>
            }
          />
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {renderHeader()}
          </ScrollView>
        )}
      </View>

      {/* Special Offer Modal */}
      <Modal
        visible={showOfferModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOfferModal(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowOfferModal(false)}>
          <Pressable
            style={styles.modalContent}
            onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('orders.specialOffer')}</Text>
              <Pressable
                onPress={() => setShowOfferModal(false)}
                style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>{'\u2715'}</Text>
              </Pressable>
            </View>
            <Input
              placeholder={t('orders.offerMessage')}
              value={offerMessage}
              onChangeText={setOfferMessage}
              multiline
              numberOfLines={3}
            />
            <Input
              placeholder={t('orders.offerPrice')}
              value={offerPrice}
              onChangeText={setOfferPrice}
              keyboardType="numeric"
            />
            <View style={styles.modalActions}>
              <Button
                title={t('common.cancel')}
                onPress={() => setShowOfferModal(false)}
                variant="outline"
                style={styles.modalBtn}
              />
              <Button
                title={t('orders.sendOffer')}
                onPress={handleSendOffer}
                loading={offerSubmitting}
                disabled={!offerMessage.trim()}
                style={styles.modalBtn}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  backText: {
    fontSize: 22,
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },

  // Order info fields
  orderInfo: {
    marginBottom: 8,
  },
  orderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  fieldBlock: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 3,
  },
  fieldValue: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
  },
  priceText: {
    color: colors.primary,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textTertiary,
    fontStyle: 'italic',
  },

  // Edit button
  editBtn: {
    marginBottom: 4,
  },
  sectionHeader: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
    paddingTop: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  emptyResponseText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },

  // Master respond
  respondSection: {
    marginTop: 16,
  },
  myResponseCard: {
    marginTop: 16,
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separatorLight,
  },
  myResponseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  myResponseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pillPending: {
    backgroundColor: colors.statusPendingBg,
  },
  pillAccepted: {
    backgroundColor: colors.statusAcceptedBg,
  },
  pillRejected: {
    backgroundColor: colors.statusRejectedBg,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  myResponseMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  specialOfferArea: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separatorLight,
    paddingTop: 12,
  },
  offerSentCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  offerSentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  offerSentMessage: {
    fontSize: 14,
    color: colors.text,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
  },

  // Completion
  completionBtn: {
    marginTop: 16,
  },
  completionInfo: {
    marginTop: 16,
    backgroundColor: colors.statusPendingBg,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  completionInfoText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    textAlign: 'center',
  },
  completionSection: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
    paddingTop: 16,
  },

  // Review
  reviewSection: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
    paddingTop: 16,
  },
  reviewInput: {
    marginTop: 12,
  },
  reviewSentText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.green,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
