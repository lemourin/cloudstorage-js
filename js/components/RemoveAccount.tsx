import * as React from "react";

import { CloudFactory, CloudAccess } from "../cloudstorage";
import { List, ListItem } from "react-toolbox/lib/list";

interface RemoveAccountProps {
    factory: CloudFactory,
    access: { [key in string]: CloudAccess }
};

export default class RemoveAccount extends React.Component<RemoveAccountProps, {}> {
    render() {
        return <List>
            {Object.keys(this.props.access).map((value, _) => {
                return <ListItem key={value} caption={value} onClick={() => {
                    this.props.factory.removeAccess(this.props.access[value]);
                }} />
            })}
        </List>;
    }
};