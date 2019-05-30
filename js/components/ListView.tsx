import * as React from "react";
import { CloudAccess, CloudItem } from "js/cloudstorage";
import { List, ListItem } from "react-toolbox/lib/list";

interface ListViewProps {
    access: CloudAccess
    root: CloudItem
    path: string
}

interface ListViewState {
    items: CloudItem[]
}

export default class ListView extends React.Component<ListViewProps, ListViewState> {
    constructor(props: ListViewProps) {
        super(props);
        this.state = {
            items: []
        }
    }

    async componentDidMount() {
        let token = "";
        const items: CloudItem[] = [];
        while (true) {
            const list = await this.props.access.listDirectoryPage(this.props.root, token);
            for (const d of list.items)
                items.push(d);
            this.setState({ items });
            if (list.nextToken === "")
                break;
            token = list.nextToken;
        }
    }

    componentWillUnmount() {
        this.props.root.destroy();
        for (const d of this.state.items) {
            d.destroy();
        }
    }

    render() {
        return <div>
            Listing view {this.props.path}
            <List>
                {
                    this.state.items.map((value: CloudItem) => {
                        return <ListItem caption={value.filename()} />;
                    })
                }
            </List>
        </div>
    }
};