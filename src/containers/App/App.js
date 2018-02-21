import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { Cell, Column, ColumnGroup, Table } from 'fixed-data-table';
import '../../../node_modules/fixed-data-table/dist/fixed-data-table.css';
import './App.css';
import _ from 'lodash';

// Set maximum refresh rate of 500ms. This could be added as a property of the App, but it seems like overkill at
// the moment.
const REFRESH_RATE_MS = 500;

@connect(
    state => ({rows: state.rows, cols: state.cols || new Array(10)})
)
export default class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      rows: [],
      cols: new Array(10)
    };
    this.onSnapshotReceived = this.onSnapshotReceived.bind(this);
    this.onUpdateReceived = this.onUpdateReceived.bind(this);
    this._cell = this._cell.bind(this);
    this._headerCell = this._headerCell.bind(this);
    this._generateCols = this._generateCols.bind(this);
  }

  // Create the tick change row for styling. The immutable identifier for the row is assumed to be 'id'.
  // The change value will be numeric and
  mapChangeRow(row, changeFunction) {
    const change = {};
    Object.getOwnPropertyNames(row).forEach(key => {
      if (key !== 'id') {
        change[key] = changeFunction(key, row);
      }
    });
    return change;
  }

  onSnapshotReceived(data) {
    const rows = [];
    const changes = [];
    data.forEach(row => {
      changes[row.id] = this.mapChangeRow(row, () => 0);
      rows[row.id] = row;
    });
    // const rows = this.state.rows.concat(data);
    console.log('snapshot' + rows);
    const cols = Object.keys(rows[0]);
    this.setState({rows, cols, changes});
  }

  onUpdateReceived(data) {
    // const rows = this.state.rows.concat(data);
    // Bypass updates that come in faster than the maximum refresh rate
    if (this.last && (Date.now() - this.last) < REFRESH_RATE_MS) {
      return;
    }
    this.last = Date.now();
    const rows = this.state.rows;
    const changes = this.state.changes;
    data.forEach(newRow => {
      changes[newRow.id] = this.mapChangeRow(newRow, (key, row) => row[key] - this.state.rows[newRow.id][key]);
      rows[newRow.id] = newRow;
    });

    this.setState({rows, changes});
  }

  _cell(cellProps) {
    const rowIndex = cellProps.rowIndex;
    const rowData = this.state.rows[rowIndex];
    const changes = this.state.changes[rowIndex];
    const col = this.state.cols[cellProps.columnKey];
    const content = rowData[col];
    // Add tick movement class for color
    let className = '';
    if (changes[col] > 0) {
      className = 'tickUp';
    } else if (changes[col] < 0) {
      className = 'tickDown';
    }
    return (
      <Cell className={className}>{content}</Cell>
    );
  }

  _headerCell(cellProps) {
    const col = this.state.cols[cellProps.columnKey];
    return (
      <Cell>{col}</Cell>
    );
  }

  _generateCols() {
    console.log('generating...');
    let cols = [];
    this.state.cols.forEach((row, index) => {
      cols.push(
        <Column
          width={100}
          flexGrow={1}
          cell={this._cell}
          header={this._headerCell}
          columnKey={index}
          />
      );
    });
    console.log(cols);
    return cols;
  };
  componentDidMount() {
    if (socket) {
      socket.on('snapshot', this.onSnapshotReceived);
      socket.on('updates', this.onUpdateReceived);
    }
  };
  componentWillUnmount() {
    if (socket) {
      socket.removeListener('snapshot', this.onSnapshotReceived);
      socket.removeListener('updates', this.onUpdateReceived);
    }
  };

  render() {
    const columns = this._generateCols();
    return (
      <Table
        rowHeight={30}
        width={window.innerWidth}
        maxHeight={window.innerHeight}
        headerHeight={35}
        rowsCount={this.state.rows.length}
        >
        {columns}
      </Table>
    );
  }
}
