/* eslint-disable react-native/no-inline-styles */
import React from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
} from "react-native";

import EmptyColumn from "./empty-column.component";
import { ColumnModel } from "../../models/column-model";
import { CardModel } from "../../models/card-model";
import { BoardTools } from "../../utils/board-tools";
import { BoardState } from "../../models/board-state";
import { COLUMN_MARGIN } from "../../board-consts";
import { KanbanContext } from "../kanban-context.provider";
import ColumnHeader from "./header.component";

export type ColumnExternalProps = {
  /**
   * Function that renders the content for an empty column.
   * @param {ColumnModel} item - The column model representing the empty column.
   * @returns {React.ReactElement} - The JSX element representing the content for the empty column.
   */
  renderEmptyColumn?: (item: ColumnModel) => React.ReactElement;

  /**
   * Function that renders a custom component for the header of each column.
   * @param {ColumnModel} item - The column model with all column's props.
   * @returns {React.ReactNode} - The JSX element representing the content for the custom header.
   */
  renderCustomHeader?: (item: ColumnModel) => React.ReactNode;
};

type Props = KanbanContext &
  ColumnExternalProps & {
    boardState: BoardState;
    column: ColumnModel;
    renderCardItem: (item: CardModel) => React.ReactNode;
    movingMode: boolean;
    singleDataColumnAvailable: boolean;
  };

type State = {};

export class Column extends React.PureComponent<Props, State> {
  scrollingDown: boolean = false;
  flatList: React.RefObject<FlatList<CardModel>> =
    React.createRef<FlatList<CardModel>>();
  viewabilityConfig: any = {
    itemVisiblePercentThreshold: 1,
    waitForInteraction: false,
  };

  setRefColumn = (ref: View | null) => {
    this.props.column.setRef(ref);
  };

  measureColumn = () => {
    this.props.column.measure();
  };

  scrollToOffset = (offset: number) => {
    this.flatList?.current?.scrollToOffset({ animated: true, offset });
  };

  handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { column } = this.props;

    const liveOffset = event.nativeEvent.contentOffset.y;
    this.scrollingDown = liveOffset > column.scrollOffset;
  };

  endScrolling = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { column } = this.props;

    const currentOffset = event.nativeEvent.contentOffset.y;
    const scrollingDownEnded =
      this.scrollingDown && currentOffset >= column.scrollOffset;
    const scrollingUpEnded =
      !this.scrollingDown && currentOffset <= column.scrollOffset;

    if (scrollingDownEnded || scrollingUpEnded) {
      column.setScrollOffset(currentOffset);
      BoardTools.validateAndMeasureBoard(this.props.boardState);
    }
  };

  onScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    this.endScrolling(event);
  };

  onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    this.endScrolling(event);
  };

  onContentSizeChange = (_: number, contentHeight: number) => {
    const { column } = this.props;
    column.setContentHeight(contentHeight);
  };

  handleChangeVisibleItems = () => {
    const { column } = this.props;
    BoardTools.validateAndMeasureBoard(this.props.boardState, column);
  };

  render = () => {
    const {
      column,
      renderCardItem,
      singleDataColumnAvailable,
      movingMode,
      boardState,
      oneColumnWidth,
      columnWidth,

      renderCustomHeader,
      renderEmptyColumn,
    } = this.props;

    const items = boardState.columnCardsMap.has(column.id)
      ? boardState.columnCardsMap.get(column.id)!
      : [];

    return (
      <View
        ref={this.setRefColumn}
        onLayout={this.measureColumn}
        style={[
          styles.columnContainer,
          {
            width: singleDataColumnAvailable ? oneColumnWidth : columnWidth,
            marginHorizontal: singleDataColumnAvailable ? 0 : COLUMN_MARGIN,
          },
        ]}
      >
        {renderCustomHeader ? (
          renderCustomHeader(column)
        ) : (
          <ColumnHeader column={column} noOfItems={items.length} />
        )}

        <FlatList
          data={items}
          ref={this.flatList}
          onScroll={this.handleScroll}
          scrollEventThrottle={0}
          onMomentumScrollEnd={this.onMomentumScrollEnd}
          onScrollEndDrag={this.onScrollEndDrag}
          onViewableItemsChanged={this.handleChangeVisibleItems}
          viewabilityConfig={this.viewabilityConfig}
          renderItem={(item) => (
            <View
              key={item.item.id}
              ref={(ref) => item.item.setRef(ref)}
              onLayout={() => item.item.validateAndMeasure()}
            >
              {renderCardItem(item.item)}
            </View>
          )}
          keyExtractor={(item) => item.id ?? ""}
          scrollEnabled={!movingMode}
          onContentSizeChange={this.onContentSizeChange}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            renderEmptyColumn ? renderEmptyColumn(column) : <EmptyColumn />
          }
        />
      </View>
    );
  };
}

export default Column;

const styles = StyleSheet.create({
  columnContainer: {
    flex: 1,
    backgroundColor: "#F2F2F2",
    borderRadius: 15,
    padding: 8,
  },
  columnHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  columnHeaderTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
