/* eslint-disable react-native/no-inline-styles */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Badge } from "./badge.component";
import { ColumnModel } from "src/models/column-model";

type Props = {
  column: ColumnModel;
  noOfItems: number;
};

export default class ColumnHeader extends React.PureComponent<Props> {
  render() {
    const { column, noOfItems } = this.props;
    return (
      <View style={styles.container}>
        <View style={styles.columnHeaderContainer}>
          <View
            style={{
              width: 19,
              height: 19,
              borderRadius: 19,
              backgroundColor: "#FF9500",
            }}
          />
          <Text style={styles.columnHeaderTitle}>{column.title}</Text>
        </View>

        <View>
          <Badge value={noOfItems} />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },
  columnHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  columnHeaderTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
