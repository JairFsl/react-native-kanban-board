/* eslint-disable react-native/no-inline-styles */
import React, { RefObject } from "react";
import {
  Animated,
  StyleSheet,
  View,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from "react-native";
import {
  GestureEvent,
  HandlerStateChangeEvent,
  LongPressGestureHandler,
  LongPressGestureHandlerEventPayload,
  State as rnState,
} from "react-native-gesture-handler";
import ReactTimeout, { ReactTimeoutProps } from "react-timeout";

import { CardModel } from "../models/card-model";
import { ColumnModel } from "../models/column-model";
import WrappedColumnsSnapContainer, {
  ColumnSnapContainer,
} from "./columns/columns-carousel-container.component";
import { BoardState } from "../models/board-state";
import { BoardTools } from "../utils/board-tools";
import { logError } from "../utils/logger";
import Card, { CardExternalProps } from "./cards/card.component";
import WrappedColumn, {
  Column,
  ColumnExternalProps,
} from "./columns/column.component";
import { KanbanContext, withKanbanContext } from "./kanban-context.provider";
import { moveElementToNewIndex } from "../utils/array-tools";
import { RFValue } from "react-native-responsive-fontsize";

export type KanbanBoardProps = CardExternalProps &
  ColumnExternalProps & {
    /**
     * An array of column models representing the columns in the Kanban board.
     */
    columns: ColumnModel[];

    /**
     * An array of card models representing the cards in the Kanban board.
     */
    cards: CardModel[];

    /**
     * Callback function invoked when a card is dragged and dropped onto another column.
     * @param {ColumnModel} srcColumn - The source column from which the card is dragged.
     * @param {ColumnModel} destColumn - The destination column onto which the card is dropped.
     * @param {CardModel} item - The card model that was dragged and dropped.
     * @param {number} targetIdx - The index at which the card was dropped within the destination column.
     */
    onDragEnd: (
      srcColumn: ColumnModel,
      destColumn: ColumnModel,
      item: CardModel,
      targetIdx: number
    ) => void;

    /**
     * Style of the kanban container.
     */
    style: StyleProp<ViewStyle>;

    /**
     * column to Scroll.
     */
    initialColumnIndex: number;
    setInitialColumnIndex: React.Dispatch<React.SetStateAction<number>>;
  };

type Props = ReactTimeoutProps & KanbanContext & KanbanBoardProps;

type State = {
  boardState: BoardState;
  boardPositionY: number;
  pan: Animated.ValueXY;
  startingX: number;
  startingY: number;
  movingMode: boolean;
  draggedItem: CardModel | undefined;
  srcColumnId: string | undefined;
  draggedItemWidth: number;
  draggedItemHeight: number;
};

class KanbanBoard extends React.PureComponent<Props, State> {
  dragX: number = 0;
  dragY: number = 0;
  carouselRef: RefObject<ColumnSnapContainer | null> =
    React.createRef<ColumnSnapContainer>();
  columnListViewsMap: Map<string, Column | null> = new Map<
    string,
    Column | null
  >();

  constructor(props: Props) {
    super(props);

    this.state = {
      boardState: {
        columnCardsMap: new Map(),
        columnsMap: new Map(),
      },
      boardPositionY: 0,
      pan: new Animated.ValueXY(),
      startingX: 0,
      startingY: 0,
      movingMode: false,
      draggedItem: undefined,
      srcColumnId: undefined,
      draggedItemWidth: 0,
      draggedItemHeight: 0,
    };
  }

  componentDidMount() {
    this.refreshBoard(this.props.columns, this.props.cards);
  }

  componentDidUpdate(prevProps: Props) {
    const { columns, cards } = this.props;

    if (prevProps.columns !== columns || prevProps.cards !== cards) {
      this.refreshBoard(columns, cards);
    }
  }

  refreshBoard(columns?: ColumnModel[], cards?: CardModel[]) {
    const { boardState } = this.state;

    var columnsMap = new Map<string, ColumnModel>(boardState.columnsMap);
    var columnCardsMap = new Map<string, CardModel[]>(
      boardState.columnCardsMap
    );

    if (columns) {
      columnsMap = new Map<string, ColumnModel>();
      columns.forEach((value) => {
        columnsMap.set(value.id, value);
      });
    }

    if (cards) {
      columnCardsMap = new Map<string, CardModel[]>();

      cards.forEach((value) => {
        if (!columnsMap.has(value.columnId)) {
          return;
        }
        if (!columnCardsMap.get(value.columnId)) {
          columnCardsMap.set(value.columnId, []);
        }
        columnCardsMap.get(value.columnId)!.push(value);
      });
    }

    columnsMap.forEach((column) => {
      if (!columnCardsMap.get(column.id)) {
        columnCardsMap.set(column.id, []);
      }
    });

    this.setState({
      boardState: {
        columnsMap: columnsMap,
        columnCardsMap: columnCardsMap,
      },
    });
  }

  onHandlerStateChange = (
    event: HandlerStateChangeEvent<LongPressGestureHandlerEventPayload>
  ) => {
    const { state } = event.nativeEvent;

    if (state === rnState.ACTIVE) {
      this.onDragStart(event);
    } else if (state === rnState.END || state === rnState.CANCELLED) {
      this.onDragEnd();
    }
  };

  scrollTimeout: ReactTimeout.Timer | undefined = undefined;
  scrollColumn(column: ColumnModel, anOffset: number) {
    const { movingMode } = this.state;

    if (this.scrollTimeout || !movingMode) {
      return;
    }

    const scrollOffset = column.scrollOffset + 40 * anOffset;
    column.setScrollOffset(scrollOffset);
    const columnComponent = this.columnListViewsMap.get(column.id);
    columnComponent?.scrollToOffset(scrollOffset);

    if (this.props.setTimeout) {
      this.scrollTimeout = this.props.setTimeout(() => {
        this.scrollTimeout = undefined;
      }, 50);
    }
  }

  onDragStart(
    event: HandlerStateChangeEvent<LongPressGestureHandlerEventPayload>
  ) {
    const { boardState, movingMode } = this.state;

    if (movingMode) {
      return;
    }

    const column = BoardTools.findColumn(
      boardState,
      event.nativeEvent.absoluteX
    );

    if (!column) {
      return;
    }

    const item = BoardTools.findCardInColumn(
      column,
      this.state.boardState,
      event.nativeEvent.absoluteY
    );

    if (!item || !item.dimensions || !item.columnId) {
      return;
    }

    const draggedItemWidth = item.dimensions.width;
    const draggedItemHeight = item.dimensions.height;

    this.state.pan.setValue({
      x: this.state.startingX - draggedItemWidth / 2 + RFValue(30),
      y: this.state.startingY - draggedItemHeight / 2 - RFValue(120),
    });

    item.hide(); // hide this item so we can display the 'dragged' item over it
    this.setState({
      movingMode: true,
      draggedItem: item,
      srcColumnId: item.columnId,
      startingX: event.nativeEvent.absoluteX,
      startingY: event.nativeEvent.absoluteY,
      draggedItemWidth: draggedItemWidth,
      draggedItemHeight: draggedItemHeight,
    });
  }

  snapTimeout: NodeJS.Timeout | undefined = undefined;
  onGestureEvent = (
    event: GestureEvent<LongPressGestureHandlerEventPayload>
  ) => {
    try {
      const { deviceWidth } = this.props;
      const {
        boardState,
        draggedItem,
        movingMode,
        draggedItemWidth,
        draggedItemHeight,
      } = this.state;

      if (!movingMode || !draggedItem) {
        return;
      }

      this.dragX = event.nativeEvent.absoluteX;
      this.dragY = event.nativeEvent.absoluteY;

      //move dragged item
      this.state.pan.setValue({
        x:
          this.dragX -
          this.state.startingX -
          draggedItemWidth / 2 +
          RFValue(30),
        y:
          this.dragY -
          this.state.startingY -
          draggedItemHeight / 2 -
          RFValue(120),
      });

      const snapMargin = RFValue(50);
      const snapAfterTimeout = 500;

      let shouldSnapPrevOrScrollLeft = this.dragX < snapMargin;
      let shouldSnapNextOrScrollRight = this.dragX > deviceWidth - snapMargin;

      if (
        !shouldSnapPrevOrScrollLeft &&
        !shouldSnapNextOrScrollRight &&
        this.snapTimeout
      ) {
        clearTimeout(this.snapTimeout);
        this.snapTimeout = undefined;
      }

      if (!this.snapTimeout && shouldSnapPrevOrScrollLeft) {
        this.snapTimeout = setTimeout(() => {
          this.carouselRef.current?.snapToPrev();
          this.snapTimeout = undefined;
        }, snapAfterTimeout);
      } else if (!this.snapTimeout && shouldSnapNextOrScrollRight) {
        this.snapTimeout = setTimeout(() => {
          this.carouselRef.current?.snapToNext();
          this.snapTimeout = undefined;
        }, snapAfterTimeout);
      }

      const targetColumn = BoardTools.findColumn(boardState, this.dragX);
      if (targetColumn) {
        //IF NEED MOVE Y ADD this.dragY to the function
        this.moveCard(draggedItem!, this.dragX, targetColumn);
        const scrollResult = BoardTools.getScrollingDirection(
          targetColumn,
          this.dragY
        );

        if (scrollResult && scrollResult.scrolling) {
          this.scrollColumn(targetColumn, scrollResult.offset);
        }
      }
    } catch (error) {
      logError("onGestureEvent: " + error);
    }
  };

  onDragEnd() {
    this.setState({ movingMode: false });

    const { draggedItem, srcColumnId } = this.state;
    const { onDragEnd } = this.props;

    if (!draggedItem) {
      return;
    }

    try {
      draggedItem.show();

      const destColumnId = draggedItem.columnId;
      this.setState({ startingX: 0, startingY: 0 });

      var srcColumn = this.state.boardState.columnsMap.get(srcColumnId!)!;
      var destColumn = this.state.boardState.columnsMap.get(destColumnId)!;

      var targetCards = this.state.boardState.columnCardsMap.get(destColumn.id);
      var targetCardIndex = targetCards?.indexOf(draggedItem) ?? 0;

      if (onDragEnd) {
        onDragEnd(srcColumn, destColumn, draggedItem!, targetCardIndex);
      }

      this.setState({
        draggedItem: undefined,
      });

      requestAnimationFrame(() => {
        BoardTools.validateAndMeasureBoard(this.state.boardState);
      });
    } catch (error) {
      logError("onDragEnd: " + error);
    }
  }

  moveCard(draggedItem: CardModel, _x: number, targetColumn: ColumnModel) {
    try {
      const columns = this.state.boardState.columnsMap;
      const fromColumn = columns.get(draggedItem.columnId);

      if (!targetColumn || !fromColumn) {
        return;
      }

      if (targetColumn.id !== fromColumn.id) {
        this.moveToOtherColumn(draggedItem, fromColumn, targetColumn);
        return;
      }
    } catch (error) {
      logError("board actions error:  " + error);
    }
  }

  moveToOtherColumn(
    item: CardModel,
    fromColumn: ColumnModel,
    toColumn: ColumnModel
  ) {
    var newColumnsMap = new Map<string, ColumnModel>(
      this.state.boardState.columnsMap
    );
    var newColumnCardsMap = new Map<string, CardModel[]>(
      this.state.boardState.columnCardsMap
    );

    var itemsFromColumn = newColumnCardsMap.get(fromColumn.id);
    var itemsToColumn = newColumnCardsMap.get(toColumn.id);

    itemsFromColumn = itemsFromColumn!.filter((x) => x.id !== item.id);

    itemsToColumn!.unshift(item);
    item.columnId = toColumn.id;
    item.invalidate();

    newColumnCardsMap.set(fromColumn.id, itemsFromColumn);
    newColumnCardsMap.set(toColumn.id, itemsToColumn!);

    this.setState({
      boardState: {
        columnsMap: newColumnsMap,
        columnCardsMap: newColumnCardsMap,
      },
    });

    requestAnimationFrame(() => {
      BoardTools.validateAndMeasureBoard(this.state.boardState);
    });
  }

  moveCardToPosition(
    draggedItem: CardModel,
    itemAtPosition: CardModel,
    column: ColumnModel
  ) {
    var newColumnsMap = new Map<string, ColumnModel>(
      this.state.boardState.columnsMap
    );
    var newColumnCardsMap = new Map<string, CardModel[]>(
      this.state.boardState.columnCardsMap
    );
    var cardsForCurrentColumn = newColumnCardsMap.get(column.id)!;

    const itemAtPositionIndex = cardsForCurrentColumn.findIndex(
      (item) => item.id === itemAtPosition.id
    );
    cardsForCurrentColumn = moveElementToNewIndex(
      cardsForCurrentColumn,
      draggedItem,
      itemAtPositionIndex
    );
    cardsForCurrentColumn.forEach((item) => {
      item.invalidate();
    });

    newColumnCardsMap.set(column.id, cardsForCurrentColumn);

    this.setState({
      boardState: {
        columnsMap: newColumnsMap,
        columnCardsMap: newColumnCardsMap,
      },
    });

    requestAnimationFrame(() => {
      BoardTools.validateAndMeasureBoard(this.state.boardState);
    });
  }

  cardPressed = (card: CardModel) => {
    const { onCardPress } = this.props;
    const { movingMode } = this.state;

    if (movingMode || !onCardPress) {
      return;
    }

    onCardPress(card);
  };

  onScrollEnd = (index: number) => {
    BoardTools.validateAndMeasureBoard(this.state.boardState);

    this.props.setInitialColumnIndex(index);
  };

  setBoardPositionY = (e: LayoutChangeEvent) => {
    this.setState({ boardPositionY: e.nativeEvent.layout.y });
  };

  renderDragCard() {
    const { cardWidth } = this.props;
    const { draggedItem, movingMode, pan, startingX, startingY } = this.state;
    const {
      renderCardContent,
      cardContainerStyle,
      cardTitleTextStyle,
      cardSubtitleTextStyle,
      cardContentTextStyle,
    } = this.props;
    if (!draggedItem || !movingMode) {
      return;
    }

    return (
      <Animated.View
        style={{
          position: "absolute",
          left: startingX,
          top: startingY,
          width: cardWidth - 16,
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        }}
      >
        <Card
          model={draggedItem!}
          hidden={false}
          renderCardContent={renderCardContent}
          cardContainerStyle={cardContainerStyle}
          cardTitleTextStyle={cardTitleTextStyle}
          cardSubtitleTextStyle={cardSubtitleTextStyle}
          cardContentTextStyle={cardContentTextStyle}
        />
      </Animated.View>
    );
  }

  renderCard = (item: CardModel) => {
    const {
      renderCardContent,
      cardContainerStyle,
      cardTitleTextStyle,
      cardSubtitleTextStyle,
      cardContentTextStyle,
    } = this.props;

    return (
      <Card
        key={item.id}
        model={item}
        hidden={item.isHidden}
        onCardPress={this.cardPressed}
        renderCardContent={renderCardContent}
        cardContainerStyle={cardContainerStyle}
        cardTitleTextStyle={cardTitleTextStyle}
        cardSubtitleTextStyle={cardSubtitleTextStyle}
        cardContentTextStyle={cardContentTextStyle}
      />
    );
  };

  renderColumn = (
    columnModel: ColumnModel,
    singleDataColumnAvailable: boolean
  ) => {
    const { renderCustomHeader, renderEmptyColumn } = this.props;
    const { movingMode, boardState } = this.state;

    return (
      <WrappedColumn
        ref={(ref) => {
          if (!ref) return undefined;
          this.columnListViewsMap.set(columnModel.id, ref);
        }}
        key={columnModel.id}
        boardState={boardState}
        column={columnModel}
        renderCustomHeader={renderCustomHeader}
        renderCardItem={this.renderCard}
        movingMode={movingMode}
        singleDataColumnAvailable={singleDataColumnAvailable}
        renderEmptyColumn={renderEmptyColumn}
        deviceWidth={this.props.deviceWidth}
        isLandscape={this.props.isLandscape}
        columnWidth={this.props.columnWidth}
        oneColumnWidth={this.props.oneColumnWidth}
        cardWidth={this.props.cardWidth}
        displayedColumns={this.props.displayedColumns}
      />
    );
  };

  render() {
    const { deviceWidth, cardWidth, style } = this.props;
    const { boardState, movingMode } = this.state;

    const columns = Array.from(boardState.columnsMap.values());

    return (
      <View style={[styles.boardContainer, style]}>
        <LongPressGestureHandler
          maxDist={Number.MAX_SAFE_INTEGER}
          onGestureEvent={this.onGestureEvent}
          onHandlerStateChange={this.onHandlerStateChange}
        >
          <View style={styles.boardContainer} onLayout={this.setBoardPositionY}>
            <WrappedColumnsSnapContainer
              ref={this.carouselRef}
              data={columns}
              onScrollEndDrag={this.onScrollEnd}
              scrollEnabled={!movingMode}
              renderItem={this.renderColumn}
              sliderWidth={deviceWidth}
              itemWidth={cardWidth}
              deviceWidth={this.props.deviceWidth}
              isLandscape={this.props.isLandscape}
              columnWidth={this.props.columnWidth}
              oneColumnWidth={this.props.oneColumnWidth}
              cardWidth={this.props.cardWidth}
              displayedColumns={this.props.displayedColumns}
              initialColumnIndex={this.props.initialColumnIndex}
              setInitialColumnIndex={this.props.setInitialColumnIndex}
            />

            {this.renderDragCard()}
          </View>
        </LongPressGestureHandler>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  boardContainer: {
    flex: 1,
  },
});

const myContext = ReactTimeout(
  withKanbanContext(KanbanBoard) as any
) as unknown as React.FC<KanbanBoardProps>;
export default myContext;
